const degree = value => ((Math.round(value)%360)+360)%360;
// A periodic aesthetic relationship, calibrated to Blue Pink Neon's original
// 224° / 359° -> 179° Neon. No shortest-arc branch at opposite/coincident hues.
export function deriveNeonHue(primary,secondary,neutrals=[false,false]) {
  if(neutrals[0]&&neutrals[1])return 0;
  if(neutrals[0])return degree(secondary);
  if(neutrals[1])return degree(primary);
  return degree(primary-45*Math.SQRT2*Math.sin((secondary-primary)*Math.PI/180));
}
export const derivedNeonNeutral = neutrals => !!(neutrals[0]&&neutrals[1]);
