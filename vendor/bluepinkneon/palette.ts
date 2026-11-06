/**
 * Palette generation with OkLCH color space.
 * Steps 0-7 use fixed L values; steps 8-10 use hue-adaptive lookup tables
 * to achieve uniform APCA contrast across all anchor hues.
 */

import type { RoleLabel } from "theme";
import { L_FG, L_FG_MUTED, L_FG_SUB } from "./apca-lookup.js";
import { oklchToHex } from "./okcolor.js";

/**
 * 8 palettes, each with 12 color steps.
 */
export type PaletteArray = string[][];

/**
 * Default anchor hue (224° = blue).
 * All 8 positions are generated at 45° intervals from this anchor.
 */
export const DEFAULT_ANCHOR = 224;

/**
 * Role labels for each position (0-7).
 * These are just semantic names for documentation.
 */
export const ROLE_LABELS: readonly RoleLabel[] = [
  "blue", // position 0: anchor + 0°
  "water", // position 1: anchor + 45°
  "void", // position 2: anchor + 90°
  "pink", // position 3: anchor + 135°
  "fire", // position 4: anchor + 180°
  "earth", // position 5: anchor + 225°
  "neon", // position 6: anchor + 270°
  "wind", // position 7: anchor + 315°
];

interface ScaleStep {
  l: number;
  c: number;
}

/**
 * Steps 0-7: fixed L/C values for structural colors.
 * Rationale:
 * - Steps 0-6 climb in Radix-style increments (≈Fibonacci ratios) so each structural surface
 *   (app bg → hover → borders) gains ~4-8 L points of contrast.
 * - Step 7 is pegged to φ = 0.618 (golden ratio) - ANSI normal chromatic, brand colors
 *
 * Steps 8-11 use hue-adaptive L values from lookup tables to achieve
 * uniform APCA contrast across all anchor hues:
 *   - Step 8: fgSub / placeholder text (Lc=50)
 *   - Step 9: fgMuted / ANSI bright (Lc=65)
 *   - Step 10: fg / body text (Lc=92)
 *   - Step 11: ANSI bright white (fixed L=0.98)
 *
 * Same palette powers light & dark modes—only the token mapping changes.
 *
 * Token mapping (dark mode, TEXT_ANCHOR=10):
 *   fg = step 10, fgMuted = step 9, fgSub = step 8
 */
export const SCALE_STEPS: ScaleStep[] = [
  { l: 0.045, c: 0.04 }, // 0 - near black
  { l: 0.09, c: 0.06 }, // 1 - deep shadow
  { l: 0.135, c: 0.08 }, // 2 - dark mode bg
  { l: 0.2, c: 0.1 }, // 3 - dark surface
  { l: 0.28, c: 0.12 }, // 4 - surface
  { l: 0.36, c: 0.14 }, // 5 - border
  { l: 0.44, c: 0.16 }, // 6 - muted
  { l: 0.618, c: 0.2 }, // 7 - golden ratio (φ) - ANSI normal / brand
];

/** Chroma values for text steps (steps 8-11) */
const TEXT_CHROMA = {
  fgSub: 0.2, // step 8
  fgMuted: 0.2, // step 9
  fg: 0.1, // step 10
  brightWhite: 0.05, // step 11
};

/** Fixed L value for ANSI bright white (step 11) */
const L_BRIGHT_WHITE = 0.98;

/**
 * Generate a 12-step color palette for a given hue.
 * Steps 0-7: fixed L values from SCALE_STEPS
 * Steps 8-11: hue-adaptive L values from lookup tables for uniform APCA contrast
 *
 * Same palette for both light and dark modes.
 */
export function generatePalette(hue: number): string[] {
  const hueIdx = ((Math.round(hue) % 360) + 360) % 360;

  // Steps 0-7: fixed L values
  const colors = SCALE_STEPS.map((step) =>
    oklchToHex({ l: step.l, c: step.c, h: hue }),
  );

  // Steps 8-11: hue-adaptive L values for uniform APCA contrast
  colors.push(
    oklchToHex({ l: L_FG_SUB[hueIdx], c: TEXT_CHROMA.fgSub, h: hue }),
  ); // 8 - fgSub (Lc=50)
  colors.push(
    oklchToHex({ l: L_FG_MUTED[hueIdx], c: TEXT_CHROMA.fgMuted, h: hue }),
  ); // 9 - fgMuted (Lc=65)
  colors.push(oklchToHex({ l: L_FG[hueIdx], c: TEXT_CHROMA.fg, h: hue })); // 10 - fg (Lc=92)
  colors.push(
    oklchToHex({ l: L_BRIGHT_WHITE, c: TEXT_CHROMA.brightWhite, h: hue }),
  ); // 11 - bright white

  return colors;
}

/**
 * Generate hues for all 8 positions from anchor.
 * Each position is 45° apart.
 */
export function generateHues(anchor: number): number[] {
  return Array.from(
    { length: 8 },
    (_, i) => (((anchor + i * 45) % 360) + 360) % 360,
  );
}

/**
 * Generate hues as a labeled record.
 */
export function generateHuesLabeled(anchor: number): Record<RoleLabel, number> {
  const hues = generateHues(anchor);
  const result = {} as Record<RoleLabel, number>;
  for (let i = 0; i < 8; i++) {
    result[ROLE_LABELS[i]] = hues[i];
  }
  return result;
}

/**
 * Generate palettes for all 8 positions from anchor.
 * Returns array of 8 palettes, each with 12 colors.
 */
export function generateAllPalettes(anchor: number): PaletteArray {
  const hues = generateHues(anchor);
  return hues.map((hue) => generatePalette(hue));
}

/**
 * L values for grayscale text steps (no hue dependence).
 * These are the average L values from the lookup tables.
 */
const GRAYSCALE_TEXT_L = {
  fgSub: 0.71, // step 8
  fgMuted: 0.8, // step 9
  fg: 0.95, // step 10
  brightWhite: 0.98, // step 11
};

/**
 * Generate a grayscale palette (chroma = 0).
 * Uses same lightness scale as chromatic palettes for steps 0-7,
 * and fixed L values for text steps 8-11 (no hue dependence).
 * When chroma is 0, hue is irrelevant - produces pure grays.
 */
export function generateGrayscalePalette(): string[] {
  // Steps 0-7: fixed L values
  const colors = SCALE_STEPS.map((step) =>
    oklchToHex({ l: step.l, c: 0, h: 0 }),
  );

  // Steps 8-11: fixed L values for grayscale (no hue-adaptive needed)
  colors.push(oklchToHex({ l: GRAYSCALE_TEXT_L.fgSub, c: 0, h: 0 })); // 8
  colors.push(oklchToHex({ l: GRAYSCALE_TEXT_L.fgMuted, c: 0, h: 0 })); // 9
  colors.push(oklchToHex({ l: GRAYSCALE_TEXT_L.fg, c: 0, h: 0 })); // 10
  colors.push(oklchToHex({ l: GRAYSCALE_TEXT_L.brightWhite, c: 0, h: 0 })); // 11

  return colors;
}
