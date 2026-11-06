// BluePinkNeon palette generator. The final Buzz module has no runtime imports.
import { generatePalette } from "./vendor/bluepinkneon/palette.ts";
import { hexToOklch } from "./vendor/bluepinkneon/okcolor.ts";

export const inject = ["react", "pages"];
const defaults = () => ({ theme: "bluepinkneon", hues: [224, 359, 134], rotation: 0 });
const degree = (value) => ((Math.round(value) % 360) + 360) % 360;

function paletteFor(choice) {
  const [primary, secondary, accent] = choice.hues.map((h) => degree(h + choice.rotation));
  const hues = { primary, cool: degree(primary + 45), shadow: degree(primary + 90), secondary,
    contrast: degree(primary + 180), warm: degree(primary + 225), accent, light: degree(accent + 45) };
  const colors = {};
  for (const [name, hue] of Object.entries(hues)) {
    generatePalette(hue).forEach((hex, step) => { colors[`--palette-${name}-${step}`] = hex; });
  }
  // Preserve the exact live Shepherd values at the default anchor.
  if (primary === 224 && secondary === 359 && accent === 134) Object.assign(colors, ORIGINAL_COLORS);
  for (const [token, ref] of Object.entries(TOKEN_REFS)) colors[token] = colors[ref];
  return colors;
}

export function apply(ctx) {
  const React = ctx.react;
  const storageKey = "com.ranveer.bluepinkneon:theme:v2";
  let choice = defaults();
  let warning = "";
  const listeners = new Set();
  let renderTheme = () => {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && ["default", "bluepinkneon"].includes(saved.theme)
      && Array.isArray(saved.hues) && saved.hues.length === 3
      && saved.hues.every((h) => Number.isFinite(h) && h >= 0 && h < 360)
      && Number.isFinite(saved.rotation) && saved.rotation >= 0 && saved.rotation < 360) {
      choice = { theme: saved.theme, hues: saved.hues.map(degree), rotation: degree(saved.rotation) };
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
    renderTheme = () => {
      if (choice.theme === "bluepinkneon") {
        const vars = Object.entries(paletteFor(choice)).map(([key, value]) => `${key}:${value};`).join("\n");
        style.textContent = `:root[data-bluepinkneon]{${vars}}\n${ROLE_CSS}`;
        root.setAttribute("data-bluepinkneon", "");
        if (!style.isConnected) document.head.appendChild(style);
      } else { style.remove(); restoreAttribute(); }
    };
    renderTheme();
    return () => { style.remove(); restoreAttribute(); renderTheme = () => {}; listeners.clear(); };
  });

  function save(next) {
    choice = next; warning = "";
    try { localStorage.setItem(storageKey, JSON.stringify(choice)); }
    catch { warning = "Applied for now, but could not save. Buzz may reset this palette after restart."; }
    renderTheme();
    for (const listener of listeners) listener();
  }

  ctx.pages.register({ id: "themes", title: "Themes", primary: true,
    component: function Themes() {
      const [, update] = React.useState(0);
      React.useEffect(() => {
        const refresh = () => update((value) => value + 1);
        listeners.add(refresh);
        return () => listeners.delete(refresh);
      }, []);
      const h = React.createElement;
      const colors = paletteFor(choice);
      const control = { color: "var(--text-standard)", background: "var(--surface-panel)",
        border: "1px solid var(--border-prominent)", borderRadius: "6px", padding: "8px" };
      return h("section", { className: "ui-card",
        style: { padding: "var(--space-panel-inset, 24px)", maxWidth: "640px" } },
        h("h1", null, "Themes"),
        h("p", null, "Chroma — make a color palette for Buzz."),
        h("label", { htmlFor: "bluepinkneon-choice" }, "Theme "),
        h("select", { id: "bluepinkneon-choice", value: choice.theme, style: control,
          onChange: (event) => { if (["default", "bluepinkneon"].includes(event.target.value)) save({ ...choice, theme: event.target.value }); } },
          h("option", { value: "default" }, "Buzz default"), h("option", { value: "bluepinkneon" }, "BluePinkNeon")),
        h("fieldset", { style: { marginTop: "24px", border: "1px solid var(--border-standard)", padding: "16px", borderRadius: "8px" } },
          h("legend", null, "Make a palette"),
          h("p", null, "Pick three hues, or rotate them together. Related colors use the original OKLCH / APCA lightness tables."),
          h("div", { style: { display: "flex", flexWrap: "wrap", gap: "20px" } },
            ...["Primary", "Secondary", "Neon accent"].map((name, index) => h("label", { key: name, style: { display: "grid", gap: "8px" } }, name,
              h("input", { type: "color", "aria-label": name,
                value: generatePalette(degree(choice.hues[index] + choice.rotation))[7],
                onChange: (event) => {
                  if (!/^#[0-9a-f]{6}$/i.test(event.target.value)) return;
                  const hues = choice.hues.map((h) => degree(h + choice.rotation));
                  hues[index] = degree(hexToOklch(event.target.value).h);
                  save({ theme: "bluepinkneon", hues, rotation: 0 });
                }, style: { width: "64px", height: "40px", cursor: "pointer" } })))),
          h("label", { htmlFor: "bluepinkneon-rotation", style: { display: "block", marginTop: "20px" } }, `Hue rotation: ${choice.rotation}°`),
          h("input", { id: "bluepinkneon-rotation", type: "range", min: 0, max: 359, step: 1,
            value: choice.rotation, style: { width: "100%", accentColor: colors["--palette-primary-7"] },
            onChange: (event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value) && value >= 0 && value < 360) save({ ...choice, theme: "bluepinkneon", rotation: degree(value) });
            } }),
          h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
            h("button", { type: "button", style: control,
              onClick: () => save({ ...choice, theme: "bluepinkneon", rotation: degree(choice.rotation + 45) }) }, "Rotate +45°"),
            h("button", { type: "button", style: control, onClick: () => save(defaults()) }, "Reset BluePinkNeon"))),
        h("div", { "aria-label": "Palette preview", style: { background: colors["--token-bg"], color: colors["--token-fg"], borderRadius: "8px", padding: "16px", marginTop: "20px" } },
          h("div", { style: { display: "flex", gap: "8px", marginBottom: "12px" } },
            ...["primary", "secondary", "accent"].map((name) => h("span", { key: name, title: name,
              style: { background: colors[`--palette-${name}-7`], width: "32px", height: "32px", borderRadius: "50%" } }))),
          "Your palette, with generated surfaces and readable text."),
        h("p", { role: "status" }, warning || (choice.theme === "bluepinkneon" ? "Palette active · saved on this device." : "Buzz default is active.")),
        h("p", null, "Disable this plugin in Manage plugins to restore Buzz’s appearance."));
    },
  });
}
