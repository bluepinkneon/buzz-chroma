/**
 * OkLCH/OkLab color utilities with APCA contrast calculation.
 * Port of colors/lib/okcolor.lua to TypeScript using culori.
 */

import { formatHex, oklch, parse, type Oklch } from "culori";

export const PHI = 1.618033988749;
export const PHI_INV = 0.618033988749;

export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

// APCA-W3 constants (SA98G)
const SA98G = {
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
} as const;

/**
 * Convert hex color to OkLCH
 */
export function hexToOklch(hex: string): OklchColor {
  const color = oklch(parse(hex));
  if (!color) throw new Error(`Invalid hex color: ${hex}`);
  return {
    l: color.l ?? 0,
    c: color.c ?? 0,
    h: color.h ?? 0,
  };
}

/**
 * Convert OkLCH to hex color
 */
export function oklchToHex(color: OklchColor): string {
  const result = formatHex({
    mode: "oklch",
    l: color.l,
    c: color.c,
    h: color.h,
  } as Oklch);
  return result ?? "#000000";
}

/**
 * Calculate perceptual distance between two OkLCH colors
 */
export function oklchDistance(a: OklchColor, b: OklchColor): number {
  const dl = a.l - b.l;
  const dc = a.c - b.c;
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 180;
  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}

/**
 * Convert OkLCH to RGB bytes [0-255]
 */
function oklchToRgbBytes(color: OklchColor): [number, number, number] {
  const hex = oklchToHex(color);
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Convert sRGB bytes to luminance (Y)
 */
function sRGBtoY(rgb: [number, number, number]): number {
  const simple = (chan: number) => (chan / 255) ** SA98G.mainTRC;
  return (
    SA98G.sRco * simple(rgb[0]) +
    SA98G.sGco * simple(rgb[1]) +
    SA98G.sBco * simple(rgb[2])
  );
}

/**
 * Calculate APCA contrast between text and background
 */
function APCAcontrast(txtY: number, bgY: number): number {
  if (
    Number.isNaN(txtY) ||
    Number.isNaN(bgY) ||
    Math.min(txtY, bgY) < 0 ||
    Math.max(txtY, bgY) > 1.1
  ) {
    return 0.0;
  }

  const adjustedTxtY =
    txtY > SA98G.blkThrs
      ? txtY
      : txtY + (SA98G.blkThrs - txtY) ** SA98G.blkClmp;
  const adjustedBgY =
    bgY > SA98G.blkThrs ? bgY : bgY + (SA98G.blkThrs - bgY) ** SA98G.blkClmp;

  if (Math.abs(adjustedBgY - adjustedTxtY) < SA98G.deltaYmin) {
    return 0.0;
  }

  let SAPC: number;
  let output: number;

  if (adjustedBgY > adjustedTxtY) {
    SAPC =
      (adjustedBgY ** SA98G.normBG - adjustedTxtY ** SA98G.normTXT) *
      SA98G.scaleBoW;
    output = SAPC < SA98G.loClip ? 0.0 : SAPC - SA98G.loBoWoffset;
  } else {
    SAPC =
      (adjustedBgY ** SA98G.revBG - adjustedTxtY ** SA98G.revTXT) *
      SA98G.scaleWoB;
    output = SAPC > -SA98G.loClip ? 0.0 : SAPC + SA98G.loWoBoffset;
  }

  return output * 100.0;
}

/**
 * Calculate APCA contrast between two OkLCH colors
 */
export function calculateApca(
  textColor: OklchColor,
  bgColor: OklchColor,
): number {
  const textBytes = oklchToRgbBytes(textColor);
  const bgBytes = oklchToRgbBytes(bgColor);
  const textY = sRGBtoY(textBytes);
  const bgY = sRGBtoY(bgBytes);
  return APCAcontrast(textY, bgY);
}

export interface SolveApcaOptions {
  maxIterations?: number;
  tolerance?: number;
  minLightness?: number;
  maxLightness?: number;
  mode?: "dark" | "light";
}

export interface SolvedColor extends OklchColor {
  Lc: number;
}

/**
 * Binary search to find lightness that achieves target APCA contrast
 */
export function solveApcaLightness(
  hue: number,
  chroma: number,
  targetLc: number,
  bgColor: OklchColor,
  options: SolveApcaOptions = {},
): SolvedColor {
  const maxIterations = options.maxIterations ?? 20;
  const tolerance = options.tolerance ?? 1.0;
  const mode = options.mode ?? "dark";
  // Dark mode: light text on dark bg (search 0.5-1.0)
  // Light mode: dark text on light bg (search 0.0-0.5)
  const minLightness = options.minLightness ?? (mode === "light" ? 0.0 : 0.5);
  const maxLightness = options.maxLightness ?? (mode === "light" ? 0.5 : 1.0);

  let low = minLightness;
  let high = maxLightness;
  let lightness = (low + high) / 2;
  let finalLc = 0;

  for (let i = 0; i < maxIterations; i++) {
    const color: OklchColor = { l: lightness, c: chroma, h: hue };
    const lc = Math.abs(calculateApca(color, bgColor));
    finalLc = lc;

    if (lc >= targetLc && Math.abs(lc - targetLc) < tolerance) {
      break;
    }

    if (lc < targetLc) {
      low = lightness;
    } else {
      high = lightness;
    }

    lightness = (low + high) / 2;
  }

  return {
    l: lightness,
    c: chroma,
    h: hue,
    Lc: finalLc,
  };
}
