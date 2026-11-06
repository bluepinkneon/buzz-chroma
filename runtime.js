import { generatePalette, generateGrayscalePalette } from "./vendor/bluepinkneon/palette.ts";
import { hexToOklch, oklchToHex, solveApcaLightness } from "./vendor/bluepinkneon/okcolor.ts";
import { createRoleEngine } from "./role-engine.js";
import { mapRoles, roleCss } from "./role-map.js";
import { PRESETS, findPreset, applyPreset } from "./presets.js";
import { LOCAL_LIMIT, LIBRARY_KEY, paletteSnapshot, paletteKey, themeSlug, isThemeName } from "./local-themes.js";
import {deriveNeonHue,derivedNeonNeutral} from "./harmony.js";

export const inject = ["react", "pages"];
const degree = (value) => ((Math.round(value) % 360) + 360) % 360;
const defaults = () => ({ theme: "bluepinkneon", hues: [224, 359, 179], rotation: 0,
  mode: "color", monoHue: null, neutral: false, neutrals: [false,false,false], appearance: "dark",surfaceOffset:90,localName:null });
const seedHues = (choice) => choice.hues.map((hue) => degree(hue + choice.rotation));
const effectiveHues = (choice) => {const hues=seedHues(choice);return choice.mode==="duo"?[hues[0],hues[1],deriveNeonHue(hues[0],hues[1],choice.neutrals)]:hues;};
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
    const neutral=choice.mode==="duo"&&index===2?derivedNeonNeutral(choice.neutrals):choice.neutrals[index];
    (mono || (neutral ? neutralRamp() : generatePalette(hue))).forEach((hex, step) => { colors[`--palette-${name}-${step}`] = hex; });
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
  if (!legacy && (!["color", "duo", "mono"].includes(saved.mode) || typeof saved.neutral !== "boolean"
    || !(saved.monoHue === null || (Number.isFinite(saved.monoHue) && saved.monoHue >= 0 && saved.monoHue < 360)))) return null;
  const hues = saved.hues.map(degree);
  if (legacy) hues[2] = degree(hues[2] + 45); // v2 stored the text family's preceding hue.
  if (!legacy && (saved.appearance !== undefined && !["dark","light","auto"].includes(saved.appearance)
    || saved.neutrals !== undefined && (!Array.isArray(saved.neutrals) || saved.neutrals.length !== 3 || !Array.from(saved.neutrals).every(v=>typeof v === "boolean"))
    || saved.surfaceOffset !== undefined && ![0,90].includes(saved.surfaceOffset)
    || saved.localName != null && !isThemeName(saved.localName))) return null;
  return { ...defaults(), theme: saved.theme, hues, rotation: degree(saved.rotation),
    appearance: legacy ? "dark" : saved.appearance ?? "dark", neutrals: legacy ? [false,false,false] : saved.neutrals ?? [false,false,false],
    surfaceOffset:legacy?90:saved.surfaceOffset??90,
    localName:legacy?null:saved.localName??null,
    ...(legacy ? {} : { mode: saved.mode, neutral: saved.neutral, monoHue: saved.monoHue === null ? null : degree(saved.monoHue) }) };
}

function readLocalEntry(entry) {
  if(!entry||typeof entry!=="object"||Array.isArray(entry)||Object.keys(entry).some(key=>!["name","look"].includes(key))||JSON.stringify(entry).length>2048||!isThemeName(entry.name)||PRESETS.some(preset=>preset.id===entry.name))return null;
  if(!entry.look||Object.keys(entry.look).some(key=>!["hues","rotation","neutrals","mode","monoHue","neutral","surfaceOffset"].includes(key)))return null;
  const look=readChoice({...entry.look,theme:"bluepinkneon",appearance:"dark"},false);
  return look?{name:entry.name,look:paletteSnapshot(look)}:null;
}

export function apply(ctx) {
  const React = ctx.react;
  const storageKey = "com.ranveer.bluepinkneon:theme:v3";
  let choice = defaults();
  let warning = "";
  let localThemes = [];
  let libraryLocked = false;
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
        const parsed=readLocalEntry(entry);
        if(!parsed||seen.has(parsed.name))throw new Error("invalid theme entry");
        seen.add(parsed.name);localThemes.push(parsed);
      }
    }
  } catch { localThemes=[];libraryLocked=true;warning="Could not read the local theme library. Its stored data has been left untouched. Saving is locked until you explicitly reset it."; }

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
    if(next.localName&&!localThemes.some(theme=>theme.name===next.localName&&paletteKey(theme.look)===paletteKey(next)))next={...next,localName:null};
    choice = next; warning = "";
    try { localStorage.setItem(storageKey, JSON.stringify(choice)); }
    catch { warning = "Applied for now, but could not save. Buzz may reset this palette after restart."; }
    renderTheme();
    for (const listener of listeners) listener();
  }

  function saveLibrary(next) {
    if(libraryLocked)return "refused";
    const parsed=next.map(readLocalEntry);
    if(next.length>LOCAL_LIMIT||parsed.some(entry=>entry===null)||new Set(parsed.map(entry=>entry.name)).size!==parsed.length) {
      warning="The theme library update was refused. Existing saved themes were not changed.";
      for(const listener of listeners)listener();return "refused";
    }
    localThemes=parsed;warning="";
    let saved=true;
    try {localStorage.setItem(LIBRARY_KEY,JSON.stringify(localThemes));}
    catch {saved=false;warning="Theme library changed for this session, but could not be saved on this device.";}
    for(const listener of listeners)listener();
    return saved?"saved":"session";
  }

  function saveLocalTheme(name) {
    if(libraryLocked)return;
    if(activeChoice().theme!=="bluepinkneon") {warning="Choose a palette before saving it.";return;}
    const base=themeSlug(name);
    if(!base) {warning="Use a theme name with letters a–z or numbers.";for(const listener of listeners)listener();return;}
    if(localThemes.length>=LOCAL_LIMIT) {warning=`You can save up to ${LOCAL_LIMIT} local themes. Remove one first.`;for(const listener of listeners)listener();return;}
    let unique=base,index=2;
    while(localThemes.some(theme=>theme.name===unique)||PRESETS.some(preset=>preset.id===unique)) {
      const suffix="-"+index++;unique=base.slice(0,60-suffix.length).replace(/-+$/g,"")+suffix;
    }
    const next={...activeChoice(),localName:unique};
    const persisted=saveLibrary([...localThemes,{name:unique,look:paletteSnapshot(next)}]);
    if(persisted==="refused")return;
    save(next);
    if(persisted==="session"){warning="Theme library changed for this session, but could not be saved on this device.";for(const listener of listeners)listener();}
  }

  function chooseColor(index, hex) {
    const choice = activeChoice();
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
    hex = hex.toLowerCase();
    const hues = seedHues(choice);
    const step = 7;
    if (hex === (choice.neutrals[index] ? neutralRamp() : generatePalette(hues[index]))[step]) return;
    const selected = hueFromSwatch(hex, step, hues[index]);
    if (selected === null) {
      const neutrals = [...choice.neutrals]; neutrals[index] = true;
      save({ ...choice, theme: "bluepinkneon", neutrals });
    } else {
      hues[index] = selected;
      const neutrals = [...choice.neutrals]; neutrals[index] = false;
      save({ ...choice, theme: "bluepinkneon", mode:choice.mode==="duo"?"duo":"color", hues, neutrals, rotation: 0 });
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
  function apiChoice(options, base = activeChoice()) {
    if (!alive) throw new Error("Chroma is disabled");
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Expected theme options");
    // A full getLook() snapshot is also a valid request. Metadata is read-only;
    // palette fields go through the same validator as saved user preferences.
    if(Object.hasOwn(options,"theme")&&Object.hasOwn(options,"hues")) {
      const keys=["theme","hues","rotation","mode","monoHue","neutral","neutrals","appearance","surfaceOffset","localName","preset","resolvedAppearance","effectiveHues"];
      if(Object.keys(options).some(key=>!keys.includes(key)))throw new TypeError("Unknown snapshot field");
      if(options.preset!==undefined&&(typeof options.preset!=="string"||!(options.preset==="custom"||PRESETS.some(preset=>preset.id===options.preset))))throw new TypeError("Invalid snapshot preset metadata");
      if(options.resolvedAppearance!==undefined&&!["dark","light"].includes(options.resolvedAppearance))throw new TypeError("Invalid snapshot appearance metadata");
      if(options.effectiveHues!==undefined&&(!Array.isArray(options.effectiveHues)||options.effectiveHues.length!==3||!Array.from(options.effectiveHues).every(h=>Number.isInteger(h)&&h>=0&&h<360)))throw new TypeError("Invalid snapshot hue metadata");
      const restored=readChoice(options,false);
      if(!restored)throw new TypeError("Invalid theme snapshot");
      return cleanLocalIdentity(restored);
    }
    const allowed = ["preset","colors","rotation","appearance","mode","monochrome","surfaceOffset"];
    if (Object.keys(options).some(key=>!allowed.includes(key))) throw new TypeError("Unknown theme option");
    let next = structuredClone(base); next.theme = "bluepinkneon";
    if(options.preset!==undefined)next=applyPreset(next,options.preset);
    if(options.surfaceOffset!==undefined) {
      if(![0,90].includes(options.surfaceOffset))throw new TypeError("surfaceOffset must be 0 or 90");
      next.surfaceOffset=options.surfaceOffset;
    }
    if (options.mode !== undefined) {
      const modes={color:"color",trichrome:"color",bichrome:"duo",dichrome:"duo",monochrome:"mono"};
      if(!Object.hasOwn(modes,options.mode))throw new TypeError("Invalid mode");
      next.mode=modes[options.mode];
    }
    let monoInput=options.monochrome;
    if (options.colors !== undefined) {
      const sizes=next.mode==="mono"?[1,3]:next.mode==="duo"?[2,3]:[3];
      if (!Array.isArray(options.colors) || !sizes.includes(options.colors.length) || !Array.from(options.colors).every(hex=>typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex))) throw new TypeError("colors must contain #RRGGBB values for the selected mode");
      if(options.colors.length===1)monoInput=options.monochrome??options.colors[0];
      else {
        const currentHues = seedHues(next);
        next.hues = [...currentHues];next.neutrals=[...next.neutrals];
        options.colors.forEach((hex,index)=>{
          next.hues[index]=hueFromSwatch(hex.toLowerCase(),7,currentHues[index])??currentHues[index];
          next.neutrals[index]=hexToOklch(hex).c<.02;
        });
        next.rotation = 0;
      }
    }
    if (options.rotation !== undefined) {
      if (!Number.isFinite(options.rotation)) throw new TypeError("rotation must be finite");
      next.rotation = degree(options.rotation);
    }
    if (options.appearance !== undefined) {
      if (!["dark","light","auto"].includes(options.appearance)) throw new TypeError("Invalid appearance");
      next.appearance = options.appearance;
    }
    if (monoInput !== undefined) {
      if (typeof monoInput !== "string" || !/^#[0-9a-f]{6}$/i.test(monoInput)) throw new TypeError("monochrome must be #RRGGBB");
      const hue = hueFromSwatch(monoInput.toLowerCase(),7,monoHue(next));
      next.mode = "mono"; next.neutral = hue === null;
      next.monoHue = hue === null ? next.monoHue ?? next.hues[0]
        : options.rotation === undefined ? degree(hue-next.rotation) : hue;
    }
    return cleanLocalIdentity(next);
  }
  function cleanLocalIdentity(next) {
    return next.localName&&!localThemes.some(theme=>theme.name===next.localName&&paletteKey(theme.look)===paletteKey(next))?{...next,localName:null}:next;
  }
  if (typeof ctx.provide === "function") ctx.provide("chroma", Object.freeze({
    version: 1,
    listPresets: () => { if (!alive) throw new Error("Chroma is disabled"); return structuredClone(PRESETS); },
    getLook: () => { if (!alive) throw new Error("Chroma is disabled");const next=activeChoice();return structuredClone({ ...next, preset:findPreset(next)?.id??"custom", effectiveHues:next.mode==="mono"?Array(3).fill(monoHue(next)):effectiveHues(next),resolvedAppearance: appearance }); },
    generateTheme: (options = {}) => {
      const next = apiChoice(options);
      return structuredClone(mapRoles(engine.generate({ ...next, hues:effectiveHues(next), monoHue:monoHue(next), neutral:monoIsNeutral(next), appearance:resolveAppearance(next.appearance) })));
    },
    setLook: (options) => {
      const next = apiChoice(options), key = Symbol();
      overrides.set(key,next); renderTheme(); for (const listener of listeners) listener();
      const dispose = () => { if (overrides.delete(key)) { renderTheme(); for (const listener of listeners) listener(); } };
      dispose.update = (options) => {
        if(!alive||!overrides.has(key))throw new Error("Look handle is inactive");
        const next=apiChoice(options,overrides.get(key));
        const isTop=[...overrides.keys()].at(-1)===key;
        overrides.set(key,next);
        if(isTop){renderTheme();for(const listener of listeners)listener();}
      };
      dispose.dispose = dispose;
      return Object.freeze(dispose);
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
      const preset = choice.localName ? null : findPreset(choice);
      const localTheme = localThemes.find(theme=>theme.name===choice.localName&&paletteKey(theme.look)===paletteKey(choice));
      const paletteName = localTheme?.name ?? preset?.id ?? "custom";
      const control = { color: "var(--text-standard)", background: "var(--surface-panel)",
        border: "1px solid var(--border-prominent)", borderRadius: "6px", padding: "8px" };
      const buttonStyle = (selected) => ({ ...control, background: selected ? "var(--affordance-selected)" : control.background });
      const swatchStyle = { width: "64px", height: "40px", cursor: "pointer" };
      const setMode = (mode) => save({ ...choice, theme: "bluepinkneon", mode });
      const changeRange = (event) => {
        const value = Number(event.target.value);
        if (!Number.isFinite(value) || value < 0 || value >= 360) return;
        save({ ...choice, theme: "bluepinkneon", rotation: degree(value) });
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
              if(theme)save({...choice,...structuredClone(theme.look),theme:"bluepinkneon",localName:theme.name});
            }
          } },
          h("option", { value: "default" }, "Buzz default"),
          ...PRESETS.map(preset=>h("option",{key:preset.id,value:preset.id},preset.id)),
          ...(localThemes.length?[h("optgroup",{label:"Saved on this device"},...localThemes.map(theme=>h("option",{key:theme.name,value:`local:${theme.name}`},theme.name)))]:[]),
          ...(!preset&&!localTheme?[h("option",{value:"custom",disabled:true},"custom")]:[])),
        h("p",null,localTheme?"Saved on this device.":preset?.description??"Your own color combination."),
        h("div", { style: {display:"flex",gap:"8px",marginTop:"16px"}, "aria-label":"Appearance" },
          ...[["dark","Dark"],["light","Light"],["auto","Auto"]].map(([value,label])=>h("button",{key:value,type:"button","aria-pressed":choice.appearance===value,style:buttonStyle(choice.appearance===value),onClick:()=>save({...choice,appearance:value})},label))),
        h("p", null, choice.appearance === "auto" ? `Auto follows Buzz’s appearance · ${appearance}.` : `${appearance === "dark" ? "Dark" : "Light"} palette.`),
        h("fieldset", { style: { marginTop: "24px", border: "1px solid var(--border-standard)", padding: "16px", borderRadius: "8px" } },
          h("legend", null, "Make a palette"),
          h("div", { style: { display: "flex", gap: "8px", marginBottom: "20px" } },
            ...[["color", "Trichrome"], ["duo","Bichrome"], ["mono", "Monochrome"]].map(([mode, label]) => h("button", {
              key: mode, type: "button", "aria-pressed": choice.mode === mode,
              style: buttonStyle(choice.mode === mode), onClick: () => setMode(mode),
            }, label))),
          choice.mode !== "mono"
            ? h("div", null,
              h("p", null, choice.mode==="duo" ? "Choose Primary and Secondary. Neon is derived automatically." : "Choose Primary, Secondary and Neon."),
              h("div", { style: { display: "flex", flexWrap: "wrap", gap: "20px" } },
                ...(choice.mode==="duo"?["Primary","Secondary"]:["Primary", "Secondary", "Neon"]).map((label, index) => h("label", { key: label, style: { display: "grid", gap: "8px" } }, label,
                  h("input", { type: "color", "aria-label": label,
                    value: (choice.neutrals[index] ? neutralRamp() : generatePalette(hues[index]))[7],
                    onChange: (event) => chooseColor(index, event.target.value), style: swatchStyle })))),
              ...(choice.mode==="duo"?[h("p",{style:{display:"flex",alignItems:"center",gap:"8px"}},h("span",{style:{display:"inline-block",width:"24px",height:"24px",borderRadius:"50%",background:(derivedNeonNeutral(choice.neutrals)?neutralRamp():generatePalette(hues[2]))[7]}}),"Neon · derived")]:[]))
            : h("div", null,
              h("p", null, monoIsNeutral(choice) ? "Neutral monochrome, with contrast-generated shades." : choice.monoHue===null ? `One hue, linked to ${paletteName}’s primary. Every shade is generated automatically.` : "One custom hue, a full range of shades."),
              h("label", { style: { display: "grid", gap: "8px" } }, "Primary",
                h("input", { type: "color", "aria-label": "Primary", style: swatchStyle,
                  value: (monoIsNeutral(choice) ? neutralRamp() : generatePalette(monoHue(choice)))[7],
                  onChange: (event) => chooseMonoColor(event.target.value) })),
              h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
                h("button", { type: "button", style: buttonStyle(!monoIsNeutral(choice)), "aria-pressed": !monoIsNeutral(choice),
                  onClick: () => save({ ...choice, neutral: false, monoHue:choice.neutrals[0]&&choice.monoHue===null?choice.hues[0]:choice.monoHue }) }, "Tinted"),
                h("button", { type: "button", style: buttonStyle(monoIsNeutral(choice)), "aria-pressed": monoIsNeutral(choice),
                  onClick: () => save({ ...choice, neutral: true, monoHue:degree(monoHue(choice)-choice.rotation) }) }, "Neutral gray"),
                h("button", { type:"button",style:buttonStyle(choice.monoHue===null),"aria-pressed":choice.monoHue===null,
                  onClick:()=>save({...choice,monoHue:null,neutral:false}) },"Use primary hue"))),
          h("label", { htmlFor: "bluepinkneon-rotation", style: { display: "block", marginTop: "20px" } }, `Hue rotation: ${choice.rotation}°`),
          h("input", { id: "bluepinkneon-rotation", type: "range", min: 0, max: 359, step: 1,
            value: choice.rotation, style: { width: "100%", accentColor: colors["--palette-primary-7"] },
            onChange: changeRange }),
          h("button", { type: "button", style: control,
            onClick: () => save({ ...choice, theme: "bluepinkneon", rotation: degree(choice.rotation + 45) }) }, "Rotate +45°"),
          h("p", null, "Alerts keep their familiar colors."),
          h("button", { type: "button", style: control, onClick: () => save(defaults()) }, "Reset blue-pink-neon")),
        h("fieldset",{style:{marginTop:"20px",border:"1px solid var(--border-standard)",padding:"16px",borderRadius:"8px"}},
          h("legend",null,"Save your theme"),
          h("label",{style:{display:"grid",gap:"8px"}},"Theme name",
            h("input",{type:"text","aria-label":"Theme name",maxLength:60,value:localName,placeholder:"my-night-palette",style:control,onChange:event=>setLocalName(event.target.value)})),
          h("button",{type:"button",style:{...control,marginTop:"12px"},disabled:libraryLocked||choice.theme==="default",onClick:()=>saveLocalTheme(localName)},"Save locally"),
          ...(libraryLocked?[h("p",null,"Reset permanently removes the stored library, including unreadable entries. Your active palette is kept."),h("button",{type:"button",style:control,onClick:()=>{
            try{localStorage.setItem(LIBRARY_KEY,"[]");localThemes=[];libraryLocked=false;save({...choice,localName:null});}
            catch{warning="Could not reset the local library. Stored data was not changed.";for(const listener of listeners)listener();}
          }},"Reset local library")]:[]),
          ...(localTheme?[h("button",{type:"button",style:{...control,marginLeft:"8px"},onClick:()=>{
            const persisted=saveLibrary(localThemes.filter(theme=>theme.name!==localTheme.name));if(persisted==="refused")return;save({...choice,localName:null});
            if(persisted==="session"){warning="Theme library changed for this session, but could not be saved on this device.";for(const listener of listeners)listener();}
          }},"Remove saved theme")]:[]),
          h("p",null,"Names use kebab-case. Saved only on this device; nothing is uploaded.")),
        h("div", { "aria-label": "Palette preview", style: { background: "var(--surface-panel)", color: "var(--text-standard)", borderRadius: "8px", padding: "16px", marginTop: "20px" } },
          h("div", { style: { display: "flex", gap: "8px", marginBottom: "12px" } },
            ...[["Primary", "--affordance-prominent"], ["Secondary", "--surface-message-own"], ["Neon", "--text-standard"]].map(([label, token]) => h("span", { key: label, title: label,
              style: { background: currentRoles?.[token], width: "32px", height: "32px", borderRadius: "50%" } }))),
          `${paletteName}, applied across Buzz.`),
        h("p", { role: "status" }, warning || (overrides.size ? "Another plugin is previewing a palette. Changing a control takes it back." : choice.theme === "bluepinkneon" ? "Palette active · saved on this device." : "Buzz default is active.")),
        h("p", null, "Disable this plugin in Manage plugins to restore Buzz’s appearance."));
    },
  });
}
