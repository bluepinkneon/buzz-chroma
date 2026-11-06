import { generatePalette, generateGrayscalePalette } from "./vendor/bluepinkneon/palette.ts";
import { hexToOklch, oklchToHex, solveApcaLightness } from "./vendor/bluepinkneon/okcolor.ts";
import { createRoleEngine } from "./role-engine.js";
import { mapRoles, roleCss } from "./role-map.js";

export const inject = ["react", "pages"];
const degree = (value) => ((Math.round(value) % 360) + 360) % 360;
const defaults = () => ({ theme: "bluepinkneon", hues: [224, 359, 179], rotation: 0,
  mode: "color", monoHue: null, neutral: false, neutrals: [false,false,false], appearance: "dark" });
const effectiveHues = (choice) => choice.hues.map((hue) => degree(hue + choice.rotation));
const monoHue = (choice) => degree((choice.monoHue ?? choice.hues[0]) + choice.rotation);
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
    ? (choice.neutral ? neutralRamp() : generatePalette(monoHue(choice))) : null;
  const colors = {};
  for (const [name, hue, index] of [["primary",primary,0],["shadow",degree(primary+90),0],["secondary",secondary,1],["light",text,2]]) {
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
    || !saved.hues.every((hue) => Number.isFinite(hue) && hue >= 0 && hue < 360)
    || !Number.isFinite(saved.rotation) || saved.rotation < 0 || saved.rotation >= 360) return null;
  if (!legacy && (!["color", "mono"].includes(saved.mode) || typeof saved.neutral !== "boolean"
    || !(saved.monoHue === null || (Number.isFinite(saved.monoHue) && saved.monoHue >= 0 && saved.monoHue < 360)))) return null;
  const hues = saved.hues.map(degree);
  if (legacy) hues[2] = degree(hues[2] + 45); // v2 stored the text family's preceding hue.
  if (!legacy && (saved.appearance !== undefined && !["dark","light","auto"].includes(saved.appearance)
    || saved.neutrals !== undefined && (!Array.isArray(saved.neutrals) || saved.neutrals.length !== 3 || !saved.neutrals.every(v=>typeof v === "boolean")))) return null;
  return { ...defaults(), theme: saved.theme, hues, rotation: degree(saved.rotation),
    appearance: saved.appearance ?? "dark", neutrals: saved.neutrals ?? [false,false,false],
    ...(legacy ? {} : { mode: saved.mode, neutral: saved.neutral, monoHue: saved.monoHue === null ? null : degree(saved.monoHue) }) };
}

export function apply(ctx) {
  const React = ctx.react;
  const storageKey = "com.ranveer.bluepinkneon:theme:v3";
  let choice = defaults();
  let warning = "";
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
      else warning = "The saved palette was invalid. Using BluePinkNeon for now.";
    }
  } catch { warning = "Could not read the saved palette. Using BluePinkNeon for now."; }

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
      appearance = resolveAppearance(active.appearance);
      if (active.theme === "bluepinkneon") {
        const vars = Object.entries(paletteFor(active)).map(([key, value]) => `${key}:${value};`).join("\n");
        const result = engine.generate({ ...active, hues: effectiveHues(active), monoHue: monoHue(active), appearance });
        currentRoles = mapRoles(result);
        const css = `:root[data-bluepinkneon]{${vars}}\n${roleCss(currentRoles, appearance, active.mode)}`;
        if (style.textContent !== css) style.textContent = css;
        root.setAttribute("data-bluepinkneon", "");
        if (!style.isConnected) document.head.appendChild(style);
      } else { style.remove(); restoreAttribute(); }
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
    const shown = (choice.neutral ? neutralRamp() : generatePalette(hue))[7];
    if (hex === shown) return;
    const selected = hueFromSwatch(hex, 7, hue);
    save({ ...choice, theme: "bluepinkneon", mode: "mono", monoHue: selected ?? hue, rotation:0, neutral: selected === null });
  }

  // The same controls, available to other trusted Buzz plugins. Overrides are
  // temporary, stack in activation order, and never write local preferences.
  function apiChoice(options) {
    if (!alive) throw new Error("Chroma is disabled");
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Expected theme options");
    const allowed = ["colors","rotation","appearance","mode","monochrome"];
    if (Object.keys(options).some(key=>!allowed.includes(key))) throw new TypeError("Unknown theme option");
    const next = structuredClone(activeChoice()); next.theme = "bluepinkneon";
    if (options.colors !== undefined) {
      if (!Array.isArray(options.colors) || options.colors.length !== 3 || !options.colors.every(hex=>typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex))) throw new TypeError("colors must be three #RRGGBB values");
      next.hues = options.colors.map((hex,index)=>hueFromSwatch(hex.toLowerCase(),7,next.hues[index]) ?? next.hues[index]);
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
      next.mode = "mono"; next.neutral = hue === null; next.monoHue = degree((hue ?? monoHue(next))-next.rotation);
    }
    return next;
  }
  if (typeof ctx.provide === "function") ctx.provide("chroma", Object.freeze({
    version: 1,
    getLook: () => { if (!alive) throw new Error("Chroma is disabled"); return structuredClone({ ...activeChoice(), resolvedAppearance: appearance }); },
    generateTheme: (options = {}) => {
      const next = apiChoice(options);
      return structuredClone(mapRoles(engine.generate({ ...next, hues:effectiveHues(next), monoHue:monoHue(next), appearance:resolveAppearance(next.appearance) })));
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
      React.useEffect(() => {
        const refresh = () => update((value) => value + 1);
        listeners.add(refresh);
        return () => listeners.delete(refresh);
      }, []);
      const h = React.createElement;
      const colors = paletteFor(choice);
      const hues = effectiveHues(choice);
      const control = { color: "var(--text-standard)", background: "var(--surface-panel)",
        border: "1px solid var(--border-prominent)", borderRadius: "6px", padding: "8px" };
      const buttonStyle = (selected) => ({ ...control, background: selected ? "var(--affordance-selected)" : control.background });
      const swatchStyle = { width: "64px", height: "40px", cursor: "pointer" };
      const setMode = (mode) => save({ ...choice, theme: "bluepinkneon", mode, monoHue: choice.monoHue ?? choice.hues[0] });
      const changeRange = (event, mono) => {
        const value = Number(event.target.value);
        if (!Number.isFinite(value) || value < 0 || value >= 360) return;
        save({ ...choice, theme: "bluepinkneon", ...(mono
          ? { monoHue: degree(value), rotation:0, neutral: false } : { rotation: degree(value) }) });
      };
      return h("section", { className: "ui-card",
        style: { padding: "var(--space-panel-inset, 24px)", maxWidth: "640px" } },
        h("h1", null, "Color Overthinkers"),
        h("p", null, "We’ve already overthought it for you."),
        h("label", { htmlFor: "bluepinkneon-choice" }, "Theme "),
        h("select", { id: "bluepinkneon-choice", value: choice.theme, style: control,
          onChange: (event) => { if (["default", "bluepinkneon"].includes(event.target.value)) save({ ...choice, theme: event.target.value }); } },
          h("option", { value: "default" }, "Buzz default"), h("option", { value: "bluepinkneon" }, "Your palette")),
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
              h("p", null, "One hue, a full range of shades. Or choose neutral gray."),
              h("label", { style: { display: "grid", gap: "8px" } }, "Monochrome hue",
                h("input", { type: "color", "aria-label": "Monochrome hue", style: swatchStyle,
                  value: (choice.neutral ? neutralRamp() : generatePalette(monoHue(choice)))[7],
                  onChange: (event) => chooseMonoColor(event.target.value) })),
              h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
                h("button", { type: "button", style: buttonStyle(!choice.neutral), "aria-pressed": !choice.neutral,
                  onClick: () => save({ ...choice, neutral: false }) }, "Tinted"),
                h("button", { type: "button", style: buttonStyle(choice.neutral), "aria-pressed": choice.neutral,
                  onClick: () => save({ ...choice, neutral: true }) }, "Neutral gray")),
              h("label", { htmlFor: "bluepinkneon-mono-hue", style: { display: "block", marginTop: "20px" } }, `Hue: ${monoHue(choice)}°`),
              h("input", { id: "bluepinkneon-mono-hue", type: "range", min: 0, max: 359, step: 1,
                disabled: choice.neutral, value: monoHue(choice), style: { width: "100%" },
                onChange: (event) => changeRange(event, true) })),
          h("p", null, "Alerts keep their familiar colors."),
          h("button", { type: "button", style: control, onClick: () => save(defaults()) }, "Reset BluePinkNeon")),
        h("div", { "aria-label": "Palette preview", style: { background: "var(--surface-panel)", color: "var(--text-standard)", borderRadius: "8px", padding: "16px", marginTop: "20px" } },
          h("div", { style: { display: "flex", gap: "8px", marginBottom: "12px" } },
            ...[["Primary", "--palette-primary-7"], ["Secondary", "--palette-secondary-7"], ["Text", "--token-fg"]].map(([label, token]) => h("span", { key: label, title: label,
              style: { background: colors[token], width: "32px", height: "32px", borderRadius: "50%" } }))),
          "Your palette, applied across Buzz."),
        h("p", { role: "status" }, warning || (overrides.size ? "Another plugin is previewing a palette. Changing a control takes it back." : choice.theme === "bluepinkneon" ? "Palette active · saved on this device." : "Buzz default is active.")),
        h("p", null, "Disable this plugin in Manage plugins to restore Buzz’s appearance."));
    },
  });
}
