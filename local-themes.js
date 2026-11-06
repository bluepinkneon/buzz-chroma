// Local user-authored themes contain palette settings only. Appearance stays a
// device preference, so loading a theme does not force Light/Dark/Auto.
export const LOCAL_LIMIT = 50;
export const LIBRARY_KEY = "com.ranveer.bluepinkneon:presets:v1";
export const isThemeName = name => typeof name==="string"&&name.length<=60&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name);
export function paletteSnapshot(choice) {
  return {hues:[...choice.hues],rotation:choice.rotation,neutrals:[...choice.neutrals],
    mode:choice.mode,monoHue:choice.monoHue,neutral:choice.neutral,surfaceOffset:choice.surfaceOffset};
}
export const paletteKey = choice => JSON.stringify(paletteSnapshot(choice));
export function themeSlug(name) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60).replace(/-$/g,"");
}
