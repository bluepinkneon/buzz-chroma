import { generatePalette, generateGrayscalePalette } from "./vendor/bluepinkneon/palette.ts";
import { hexToOklch, oklchToHex, solveApcaLightness } from "./vendor/bluepinkneon/okcolor.ts";
import { createRoleEngine } from "./role-engine.js";
import { mapRoles, roleCss } from "./role-map.js";
import { PRESETS, findPreset, applyPreset } from "./presets.js";
import { LOCAL_LIMIT, LIBRARY_KEY, paletteSnapshot, paletteKey, themeSlug } from "./local-themes.js";

export const inject = ["react", "pages"];
const degree = (value) => ((Math.round(value) % 360) + 360) % 360;
const defaults = () => ({ theme: "bluepinkneon", hues: [224, 359, 179], rotation: 0,
  mode: "color", monoHue: null, neutral: false, neutrals: [false,false,false], appearance: "dark",surfaceOffset:90 });
const effectiveHues = (choice) => choice.hues.map((hue) => degree(hue + choice.rotation));
const monoHue = (choice) => degree((choice.monoHue ?? choice.hues[0]) + choice.rotation);
const monoIsNeutral = (choice) => choice.neutral || (choice.monoHue === null && choice.neutrals[0]);
const angularDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const hueTables = new Map();
let grayRamp;

function neutralRamp() {
  if (!grayRamp) {
    grayRamp = generateGrayscalePalette();
    for (const [step, target] of [[8, 50], [9, 65], [10, 92]]) {
      const solved = solveApcaLightness(0, 0, target, { l: 0.135, c: 0, h: 0 },
        { tolerance: 0.1, maxIterations: 32 });
      grayRamp[step] = oklchToHex({ l: solved.l, c: 0, h: 0 });
    }
  }
  return grayRamp;
}

// Invert the rendered swatch rather than treating its clamped hue as the input
// hue. Ties prefer the current generator hue, preserving round trips.
function hueFromSwatch(hex, step, current) {
  const input = hexToOklch(hex);
  if (input.c < 0.02) return null;
  if (!hueTables.has(step)) {
    hueTables.set(step, Array.from({ length: 360 }, (_, hue) => {
      const color = generatePalette(hue)[step];
      return { hue, color, renderedHue: hexToOklch(color).h };
    }));
  }
  let best;
  let bestError = Infinity;
  for (const candidate of hueTables.get(step)) {
    const error = candidate.color === hex ? -1 : angularDistance(candidate.renderedHue, input.h);
    if (error < bestError - 1e-9 || (Math.abs(error - bestError) <= 1e-9
      && angularDistance(candidate.hue, current) < angularDistance(best, current))) {
      best = candidate.hue;
      bestError = error;
    }
  }
  return best;
}

function paletteFor(choice) {
  const [primary, secondary, text] = effectiveHues(choice);
  const mono = choice.mode === "mono"
    ? (monoIsNeutral(choice) ? neutralRamp() : generatePalette(monoHue(choice))) : null;
  const colors = {};
  for (const [name, hue, index] of [["primary",primary,0],["shadow",degree(primary+choice.surfaceOffset),0],["secondary",secondary,1],["light",text,2]]) {
    (mono || (choice.neutrals[index] ? neutralRamp() : generatePalette(hue))).forEach((hex, step) => { colors[`--palette-${name}-${step}`] = hex; });
  }
  // Semantic signals are protected roles, independent of decorative rotation.
  // Using their hand-tuned source ramps also removes the old exact-preset cliff.
  for (const [name, hex] of Object.entries(ORIGINAL_COLORS)) {
    if (/^--palette-(contrast|warm|accent|cool)-/.test(name)) colors[name] = hex;
  }
  for (const [token, ref] of Object.entries(TOKEN_REFS)) colors[token] = colors[ref];
  return colors;
}

function readChoice(saved, legacy) {
  if (!saved || !["default", "bluepinkneon"].includes(saved.theme)
    || !Array.isArray(saved.hues) || saved.hues.length !== 3
    || !Array.from(saved.hues).every((hue) => Number.isFinite(hue) && hue >= 0 && hue < 360)
    || !Number.isFinite(saved.rotation) || saved.rotation < 0 || saved.rotation >= 360) return null;
  if (!legacy && (!["color", "mono"].includes(saved.mode) || typeof saved.neutral !== "boolean"
    || !(saved.monoHue === null || (Number.isFinite(saved.monoHue) && saved.monoHue >= 0 && saved.monoHue < 360)))) return null;
  const hues = saved.hues.map(degree);
  if (legacy) hues[2] = degree(hues[2] + 45); // v2 stored the text family's preceding hue.
  if (!legacy && (saved.appearance !== undefined && !["dark","light","auto"].includes(saved.appearance)
    || saved.neutrals !== undefined && (!Array.isArray(saved.neutrals) || saved.neutrals.length !== 3 || !Array.from(saved.neutrals).every(v=>typeof v === "boolean"))
    || saved.surfaceOffset !== undefined && ![0,90].includes(saved.surfaceOffset))) return null;
  return { ...defaults(), theme: saved.theme, hues, rotation: degree(saved.rotation),
    appearance: legacy ? "dark" : saved.appearance ?? "dark", neutrals: legacy ? [false,false,false] : saved.neutrals ?? [false,false,false],
    surfaceOffset:legacy?90:saved.surfaceOffset??90,
    ...(legacy ? {} : { mode: saved.mode, neutral: saved.neutral, monoHue: saved.monoHue === null ? null : degree(saved.monoHue) }) };
}

export function apply(ctx) {
  const React = ctx.react;
  const storageKey = "com.ranveer.bluepinkneon:theme:v3";
  let choice = defaults();
  let warning = "";
  let localThemes = [];
  const listeners = new Set();
  let renderTheme = () => {};
  const engine = createRoleEngine(ORIGINAL_COLORS);
  const overrides = new Map();
  const activeChoice = () => [...overrides.values()].at(-1) ?? choice;
  let appearance = "dark";
  let currentRoles;
  let alive = true;
  const resolveAppearance = (value) => value !== "auto" ? value
    : ["light","dark"].includes(document.documentElement.getAttribute("data-color-mode")) ? document.documentElement.getAttribute("data-color-mode")
      : globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches === false ? "light" : "dark";
  try {
    const current = localStorage.getItem(storageKey);
    const raw = current ?? localStorage.getItem("com.ranveer.bluepinkneon:theme:v2");
    if (raw !== null) {
      const restored = readChoice(JSON.parse(raw), current === null);
      if (restored) choice = restored;
      else warning = "The saved palette was invalid. Using blue-pink-neon for now.";
    }
  } catch { warning = "Could not read the saved palette. Using blue-pink-neon for now."; }
  try {
    const raw=localStorage.getItem(LIBRARY_KEY);
    if(raw!==null) {
      if(raw.length>131072)throw new Error("oversized library");
      const entries=JSON.parse(raw),seen=new Set();
      if(!Array.isArray(entries)||entries.length>LOCAL_LIMIT)throw new Error("invalid library");
      for(const entry of entries) {
        if(!entry||Object.keys(entry).some(key=>!["name","look"].includes(key))||JSON.stringify(entry).length>2048||typeof entry.name!=="string"||entry.name.length>60||entry.name!==themeSlug(entry.name)||!entry.name||seen.has(entry.name)||PRESETS.some(preset=>preset.id===entry.name))throw new Error("invalid theme name");
        if(!entry.look||Object.keys(entry.look).some(key=>!["hues","rotation","neutrals","mode","monoHue","neutral","surfaceOffset"].includes(key)))throw new Error("invalid theme fields");
        const look=readChoice({...entry.look,theme:"bluepinkneon",appearance:"dark"},false);
        if(!look)throw new Error("invalid theme palette");
        seen.add(entry.name);localThemes.push({name:entry.name,look:paletteSnapshot(look)});
      }
    }
  } catch { localThemes=[];warning="Could not read the local theme library. Its stored data has been left untouched."; }

  ctx.effect(() => {
    const root = document.documentElement;
    const style = document.createElement("style");
    style.dataset.plugin = "com.ranveer.bluepinkneon";
    const previousAttribute = root.getAttribute("data-bluepinkneon");
    function restoreAttribute() {
      if (previousAttribute === null) root.removeAttribute("data-bluepinkneon");
      else root.setAttribute("data-bluepinkneon", previousAttribute);
    }
    const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    renderTheme = () => {
      const active = activeChoice();
      const nextAppearance = resolveAppearance(active.appearance);
      if (active.theme === "bluepinkneon") {
        const vars = Object.entries(paletteFor(active)).map(([key, value]) => `${key}:${value};`).join("\n");
        let result;
        try { result = engine.generate({ ...active, hues: effectiveHues(active), monoHue: monoHue(active), neutral:monoIsNeutral(active), appearance:nextAppearance }); }
        catch (error) {
          warning = "Could not generate that palette. Keeping the last good appearance.";
          console.warn("[Color Overthinkers] palette-generation-failed", error);
          return;
        }
        appearance = nextAppearance;
        currentRoles = mapRoles(result);
        const css = `:root[data-bluepinkneon]{${vars}}\n${roleCss(currentRoles, appearance, active.mode)}`;
        if (style.textContent !== css) style.textContent = css;
        root.setAttribute("data-bluepinkneon", "");
        if (!style.isConnected) document.head.appendChild(style);
      } else { appearance = nextAppearance; style.remove(); restoreAttribute(); }
    };
    const refresh = () => { renderTheme(); for (const listener of listeners) listener(); };
    const observer = typeof MutationObserver === "function" ? new MutationObserver(refresh) : null;
    observer?.observe(root, { attributes:true, attributeFilter:["data-color-mode"] });
    media?.addEventListener("change", refresh);
    renderTheme();
    return () => { alive = false; observer?.disconnect(); media?.removeEventListener("change",refresh); style.remove(); restoreAttribute(); renderTheme = () => {}; listeners.clear(); overrides.clear(); };
  });

  function save(next) {
    overrides.clear(); // A person changing the controls takes back ownership.
    choice = next; warning = "";
    try { localStorage.setItem(storageKey, JSON.stringify(choice)); }
    catch { warning = "Applied for now, but could not save. Buzz may reset this palette after restart."; }
    renderTheme();
    for (const listener of listeners) listener();
  }

  function saveLibrary(next) {
    localThemes=next;warning="";
    try {localStorage.setItem(LIBRARY_KEY,JSON.stringify(localThemes));}
    catch {warning="Theme library changed for this session, but could not be saved on this device.";}
    for(const listener of listeners)listener();
  }

  function saveLocalTheme(name) {
    if(activeChoice().theme!=="bluepinkneon") {warning="Choose a palette before saving it.";return;}
    const base=themeSlug(name);
    if(!base) {warning="Use a theme name with letters a–z or numbers.";for(const listener of listeners)listener();return;}
    if(localThemes.length>=LOCAL_LIMIT) {warning=`You can save up to ${LOCAL_LIMIT} local themes. Remove one first.`;for(const listener of listeners)listener();return;}
    let unique=base,index=2;
    while(localThemes.some(theme=>theme.name===unique)||PRESETS.some(preset=>preset.id===unique))unique=base.slice(0,55)+"-"+index++;
    saveLibrary([...localThemes,{name:unique,look:paletteSnapshot(activeChoice())}]);
  }

  function chooseColor(index, hex) {
    const choice = activeChoice();
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
    hex = hex.toLowerCase();
    const hues = effectiveHues(choice);
    const step = 7;
    if (hex === (choice.neutrals[index] ? neutralRamp() : generatePalette(hues[index]))[step]) return;
    const selected = hueFromSwatch(hex, step, hues[index]);
    if (selected === null) {
      const neutrals = [...choice.neutrals]; neutrals[index] = true;
      save({ ...choice, theme: "bluepinkneon", neutrals });
    } else {
      hues[index] = selected;
      const neutrals = [...choice.neutrals]; neutrals[index] = false;
      save({ ...choice, theme: "bluepinkneon", mode: "color", hues, neutrals, rotation: 0 });
    }
  }

  function chooseMonoColor(hex) {
    const choice = activeChoice();
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
    hex = hex.toLowerCase();
    const hue = monoHue(choice);
    const shown = (monoIsNeutral(choice) ? neutralRamp() : generatePalette(hue))[7];
    if (hex === shown) return;
    const selected = hueFromSwatch(hex, 7, hue);
    save({ ...choice, theme: "bluepinkneon", mode: "mono", monoHue: degree((selected ?? hue)-choice.rotation), neutral: selected === null });
  }

  // The same controls, available to other trusted Buzz plugins. Overrides are
  // temporary, stack in activation order, and never write local preferences.
  function apiChoice(options) {
    if (!alive) throw new Error("Chroma is disabled");
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Expected theme options");
    // A full getLook() snapshot is also a valid request. Metadata is read-only;
    // palette fields go through the same validator as saved user preferences.
    if(Object.hasOwn(options,"theme")&&Object.hasOwn(options,"hues")) {
      const keys=["theme","hues","rotation","mode","monoHue","neutral","neutrals","appearance","surfaceOffset","preset","resolvedAppearance"];
      if(Object.keys(options).some(key=>!keys.includes(key)))throw new TypeError("Unknown snapshot field");
      const restored=readChoice(options,false);
      if(!restored)throw new TypeError("Invalid theme snapshot");
      return restored;
    }
    const allowed = ["preset","colors","rotation","appearance","mode","monochrome","surfaceOffset"];
    if (Object.keys(options).some(key=>!allowed.includes(key))) throw new TypeError("Unknown theme option");
    let next = structuredClone(activeChoice()); next.theme = "bluepinkneon";
    if(options.preset!==undefined)next=applyPreset(next,options.preset);
    if(options.surfaceOffset!==undefined) {
      if(![0,90].includes(options.surfaceOffset))throw new TypeError("surfaceOffset must be 0 or 90");
      next.surfaceOffset=options.surfaceOffset;
    }
    if (options.colors !== undefined) {
      if (!Array.isArray(options.colors) || options.colors.length !== 3 || !Array.from(options.colors).every(hex=>typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex))) throw new TypeError("colors must be three #RRGGBB values");
      const currentHues = effectiveHues(next);
      next.hues = options.colors.map((hex,index)=>hueFromSwatch(hex.toLowerCase(),7,currentHues[index]) ?? currentHues[index]);
      next.neutrals = options.colors.map(hex=>hexToOklch(hex).c < .02);
      next.rotation = 0;
    }
    if (options.rotation !== undefined) {
      if (!Number.isFinite(options.rotation)) throw new TypeError("rotation must be finite");
      next.rotation = degree(options.rotation);
    }
    if (options.appearance !== undefined) {
      if (!["dark","light","auto"].includes(options.appearance)) throw new TypeError("Invalid appearance");
      next.appearance = options.appearance;
    }
    if (options.mode !== undefined) {
      if (!["color","monochrome"].includes(options.mode)) throw new TypeError("Invalid mode");
      next.mode = options.mode === "monochrome" ? "mono" : "color";
    }
    if (options.monochrome !== undefined) {
      if (typeof options.monochrome !== "string" || !/^#[0-9a-f]{6}$/i.test(options.monochrome)) throw new TypeError("monochrome must be #RRGGBB");
      const hue = hueFromSwatch(options.monochrome.toLowerCase(),7,monoHue(next));
      next.mode = "mono"; next.neutral = hue === null;
      next.monoHue = hue === null ? next.monoHue ?? next.hues[0]
        : options.rotation === undefined ? degree(hue-next.rotation) : hue;
    }
    return next;
  }
  if (typeof ctx.provide === "function") ctx.provide("chroma", Object.freeze({
    version: 1,
    listPresets: () => { if (!alive) throw new Error("Chroma is disabled"); return structuredClone(PRESETS); },
    getLook: () => { if (!alive) throw new Error("Chroma is disabled"); return structuredClone({ ...activeChoice(), preset:findPreset(activeChoice())?.id??"custom", resolvedAppearance: appearance }); },
    generateTheme: (options = {}) => {
      const next = apiChoice(options);
      return structuredClone(mapRoles(engine.generate({ ...next, hues:effectiveHues(next), monoHue:monoHue(next), neutral:monoIsNeutral(next), appearance:resolveAppearance(next.appearance) })));
    },
    setLook: (options) => {
      const next = apiChoice(options), key = Symbol();
      overrides.set(key,next); renderTheme(); for (const listener of listeners) listener();
      return () => { if (overrides.delete(key)) { renderTheme(); for (const listener of listeners) listener(); } };
    },
  }));

  ctx.pages.register({ id: "themes", title: "Themes", primary: true, icon: PLUGIN_ICON,
    component: function Themes() {
      const choice = activeChoice();
      const [, update] = React.useState(0);
      const [localName,setLocalName] = React.useState("");
      React.useEffect(() => {
        const refresh = () => update((value) => value + 1);
        listeners.add(refresh);
        return () => listeners.delete(refresh);
      }, []);
      const h = React.createElement;
      const colors = paletteFor(choice);
      const hues = effectiveHues(choice);
      const preset = findPreset(choice);
      const localTheme = localThemes.find(theme=>paletteKey(theme.look)===paletteKey(choice));
      const paletteName = localTheme?.name ?? preset?.id ?? "custom";
      const control = { color: "var(--text-standard)", background: "var(--surface-panel)",
        border: "1px solid var(--border-prominent)", borderRadius: "6px", padding: "8px" };
      const buttonStyle = (selected) => ({ ...control, background: selected ? "var(--affordance-selected)" : control.background });
      const swatchStyle = { width: "64px", height: "40px", cursor: "pointer" };
      const setMode = (mode) => save({ ...choice, theme: "bluepinkneon", mode });
      const changeRange = (event, mono) => {
        const value = Number(event.target.value);
        if (!Number.isFinite(value) || value < 0 || value >= 360) return;
        save({ ...choice, theme: "bluepinkneon", ...(mono
          ? { monoHue: degree(value-choice.rotation), neutral: false } : { rotation: degree(value) }) });
      };
      return h("section", { className: "ui-card",
        style: { padding: "var(--space-panel-inset, 24px)", maxWidth: "640px" } },
        h("h1", null, "Color Overthinkers"),
        h("p", null, "We’ve already overthought it for you."),
        h("label", { htmlFor: "bluepinkneon-choice" }, "Theme "),
        h("select", { id: "bluepinkneon-choice", value: choice.theme === "default" ? "default" : localTheme?`local:${localTheme.name}`:preset?.id??"custom", style: control,
          onChange: (event) => {
            const id=event.target.value;
            if(id==="default")save({...choice,theme:"default"});
            else if(PRESETS.some(preset=>preset.id===id))save(applyPreset(choice,id));
            else if(id.startsWith("local:")) {
              const theme=localThemes.find(theme=>`local:${theme.name}`===id);
              if(theme)save({...choice,...structuredClone(theme.look),theme:"bluepinkneon"});
            }
          } },
          h("option", { value: "default" }, "Buzz default"),
          ...PRESETS.map(preset=>h("option",{key:preset.id,value:preset.id},preset.id)),
          ...(localThemes.length?[h("optgroup",{label:"Saved on this device"},...localThemes.map(theme=>h("option",{key:theme.name,value:`local:${theme.name}`},theme.name)))]:[]),
          ...(!preset&&!localTheme?[h("option",{value:"custom",disabled:true},"custom")]:[])),
        h("p",null,localTheme?"Saved on this device.":preset?.description??"Your own three-color combination."),
        h("div", { style: {display:"flex",gap:"8px",marginTop:"16px"}, "aria-label":"Appearance" },
          ...[["dark","Dark"],["light","Light"],["auto","Auto"]].map(([value,label])=>h("button",{key:value,type:"button","aria-pressed":choice.appearance===value,style:buttonStyle(choice.appearance===value),onClick:()=>save({...choice,appearance:value})},label))),
        h("p", null, choice.appearance === "auto" ? `Auto follows Buzz’s appearance · ${appearance}.` : `${appearance === "dark" ? "Dark" : "Light"} palette.`),
        h("fieldset", { style: { marginTop: "24px", border: "1px solid var(--border-standard)", padding: "16px", borderRadius: "8px" } },
          h("legend", null, "Make a palette"),
          h("div", { style: { display: "flex", gap: "8px", marginBottom: "20px" } },
            ...[["color", "Full color"], ["mono", "Monochrome"]].map(([mode, label]) => h("button", {
              key: mode, type: "button", "aria-pressed": choice.mode === mode,
              style: buttonStyle(choice.mode === mode), onClick: () => setMode(mode),
            }, label))),
          choice.mode === "color"
            ? h("div", null,
              h("p", null, "Pick three hues, or rotate them together."),
              h("div", { style: { display: "flex", flexWrap: "wrap", gap: "20px" } },
                ...["Primary", "Secondary", "Text"].map((label, index) => h("label", { key: label, style: { display: "grid", gap: "8px" } }, label,
                  h("input", { type: "color", "aria-label": label,
                    value: (choice.neutrals[index] ? neutralRamp() : generatePalette(hues[index]))[7],
                    onChange: (event) => chooseColor(index, event.target.value), style: swatchStyle })))),
              h("label", { htmlFor: "bluepinkneon-rotation", style: { display: "block", marginTop: "20px" } }, `Hue rotation: ${choice.rotation}°`),
              h("input", { id: "bluepinkneon-rotation", type: "range", min: 0, max: 359, step: 1,
                value: choice.rotation, style: { width: "100%", accentColor: colors["--palette-primary-7"] },
                onChange: (event) => changeRange(event, false) }),
              h("button", { type: "button", style: control,
                onClick: () => save({ ...choice, theme: "bluepinkneon", rotation: degree(choice.rotation + 45) }) }, "Rotate +45°"))
            : h("div", null,
              h("p", null, monoIsNeutral(choice) ? "Neutral monochrome, with contrast-generated shades." : choice.monoHue===null ? `One hue, linked to ${paletteName}’s primary. Every shade is generated automatically.` : "One custom hue, a full range of shades."),
              h("label", { style: { display: "grid", gap: "8px" } }, "Monochrome hue",
                h("input", { type: "color", "aria-label": "Monochrome hue", style: swatchStyle,
                  value: (monoIsNeutral(choice) ? neutralRamp() : generatePalette(monoHue(choice)))[7],
                  onChange: (event) => chooseMonoColor(event.target.value) })),
              h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
                h("button", { type: "button", style: buttonStyle(!monoIsNeutral(choice)), "aria-pressed": !monoIsNeutral(choice),
                  onClick: () => save({ ...choice, neutral: false, monoHue:choice.neutrals[0]&&choice.monoHue===null?choice.hues[0]:choice.monoHue }) }, "Tinted"),
                h("button", { type: "button", style: buttonStyle(monoIsNeutral(choice)), "aria-pressed": monoIsNeutral(choice),
                  onClick: () => save({ ...choice, neutral: true, monoHue:degree(monoHue(choice)-choice.rotation) }) }, "Neutral gray"),
                h("button", { type:"button",style:buttonStyle(choice.monoHue===null),"aria-pressed":choice.monoHue===null,
                  onClick:()=>save({...choice,monoHue:null,neutral:false}) },"Use primary hue")),
              h("label", { htmlFor: "bluepinkneon-mono-hue", style: { display: "block", marginTop: "20px" } }, `Hue: ${monoHue(choice)}°`),
              h("input", { id: "bluepinkneon-mono-hue", type: "range", min: 0, max: 359, step: 1,
                disabled: monoIsNeutral(choice), value: monoHue(choice), style: { width: "100%" },
                onChange: (event) => changeRange(event, true) })),
          h("p", null, "Alerts keep their familiar colors."),
          h("button", { type: "button", style: control, onClick: () => save(defaults()) }, "Reset blue-pink-neon")),
        h("fieldset",{style:{marginTop:"20px",border:"1px solid var(--border-standard)",padding:"16px",borderRadius:"8px"}},
          h("legend",null,"Save your theme"),
          h("label",{style:{display:"grid",gap:"8px"}},"Theme name",
            h("input",{type:"text","aria-label":"Theme name",maxLength:60,value:localName,placeholder:"my-night-palette",style:control,onChange:event=>setLocalName(event.target.value)})),
          h("button",{type:"button",style:{...control,marginTop:"12px"},disabled:choice.theme==="default",onClick:()=>saveLocalTheme(localName)},"Save locally"),
          ...(localTheme?[h("button",{type:"button",style:{...control,marginLeft:"8px"},onClick:()=>saveLibrary(localThemes.filter(theme=>theme.name!==localTheme.name))},"Remove saved theme")]:[]),
          h("p",null,"Names use kebab-case. Saved only on this device; nothing is uploaded.")),
        h("div", { "aria-label": "Palette preview", style: { background: "var(--surface-panel)", color: "var(--text-standard)", borderRadius: "8px", padding: "16px", marginTop: "20px" } },
          h("div", { style: { display: "flex", gap: "8px", marginBottom: "12px" } },
            ...[["Primary", "--affordance-prominent"], ["Secondary", "--surface-message-own"], ["Text", "--text-standard"]].map(([label, token]) => h("span", { key: label, title: label,
              style: { background: currentRoles?.[token], width: "32px", height: "32px", borderRadius: "50%" } }))),
          `${paletteName}, applied across Buzz.`),
        h("p", { role: "status" }, warning || (overrides.size ? "Another plugin is previewing a palette. Changing a control takes it back." : choice.theme === "bluepinkneon" ? "Palette active · saved on this device." : "Buzz default is active.")),
        h("p", null, "Disable this plugin in Manage plugins to restore Buzz’s appearance."));
    },
  });
}
