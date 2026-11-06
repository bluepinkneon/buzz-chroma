# How Chroma generates colors

Chroma uses the original BluePinkNeon OKLCH generator. OKLCH separates perceived
lightness (`L`), chroma (`C`, color intensity) and hue (`h`, an angle).

## The original hue wheel

The default anchor is 224°. Eight families lie 45° apart:

```text
hue[i] = (anchor + i × 45°) mod 360°
```

Primary, secondary and accent use positions 0, 3 and 6 by default. The other
families supply surfaces, text and semantic colors.

The Buzz controls extend this by letting those three hues be chosen independently.
Primary drives the related surface families; the neon-accent hue also drives the
text family. Rotation adds the same angle to all three selected hues. Each color
picker supplies a hue; the generator determines lightness and chroma.

The original generator's three inputs were **Anchor**, **ANSI Index** (which wheel
position supplies each semantic color), and **Brand Index** (position and shade
for primary, secondary and accent). The Buzz adapter's three hue pickers are a
different control model; they do not expose those original role assignments.

## Twelve shades per family

Steps 0–7 use fixed OKLCH lightness/chroma pairs:

| Step | Lightness | Chroma | Purpose |
| --- | --- | --- | --- |
| 0 | 0.045 | 0.04 | Near black |
| 1 | 0.090 | 0.06 | Deep shadow |
| 2 | 0.135 | 0.08 | Dark background |
| 3 | 0.200 | 0.10 | Surface |
| 4 | 0.280 | 0.12 | Surface/border |
| 5 | 0.360 | 0.14 | Raised surface/border |
| 6 | 0.440 | 0.16 | Muted color |
| 7 | 0.618 | 0.20 | Brand/accent fill |

The 0.618 accent lightness is an aesthetic choice inspired by the golden ratio.
It is not an accessibility measurement.

Text steps 8–10 use precomputed, 360-entry lightness lookup tables, indexed by
the nearest whole hue degree. They target APCA contrast magnitudes of:

| Step | Role | Target | Chroma |
| --- | --- | --- | --- |
| 8 | Subdued text | Lc 50 | 0.20 |
| 9 | Muted text | Lc 65 | 0.20 |
| 10 | Body text | Lc 92 | 0.10 |

Step 11 uses lightness 0.98 and chroma 0.05 for a near-white tint. Culori converts
the generated OKLCH colors to sRGB hexadecimal values.

## Why the lookup tables exist

Different hues at the same OKLCH lightness can produce different sRGB text
contrast. The tables adjust lightness by hue. Their original generation used
an APCA solver against a reference dark background at `L=0.135, C=0.08`.

The plugin maps the resulting palette onto Buzz's semantic color roles. Text,
surfaces and accents have different jobs; changing a hue does not give every
element the same brightness.

## Limits

- The APCA targets describe the lookup-table reference conditions. They do not
  certify every pair of colors or every Buzz component.
- Independent hue choices and sRGB conversion can change contrast relationships.
  Review the actual UI after making a custom palette.
- The BluePinkNeon reset preserves all 152 color tokens from the original
  Shepherd stylesheet exactly. Its red and green were manually tuned outside
  the original 45° wheel. The current exact-preset special case therefore creates
  a visible jump in those signal colors when rotation first leaves zero; this is
  not merely generator-version rounding drift.
- This plugin currently applies the dark palette. Buzz's saved Light/System
  preference is preserved and takes effect again when the plugin is disabled.

## Current Buzz-adapter gaps

A review of v1.0.0 reproduced these limitations in the shipped module. The icon
and description update does not change its color calculations.

- **Semantic colors rotate and can coincide.** Danger follows primary +180°;
  success follows the independently selected accent. Those hues can be identical.
  In one example, an orange accent produces success `#ffa742` beside danger
  `#ffa55d`. Keep signal roles separate from decorative color rotation in a future
  adapter revision.
- **The preset has a discontinuity.** The generated default differs from the
  snapshot in 22 of 96 palette entries, all in the hand-tuned danger/success
  families. A one-degree departure can change danger by about 13.8 on a
  0–100-scaled OKLab distance, much more than a normal one-degree step.
- **The RGB picker round-trip can change hue.** The generator converts colors
  outside the sRGB gamut by channel clamping. Reading the hue back from that
  rendered swatch is not an inverse of generation: 204 of 360 step-7 swatches
  change the saved hue when reselected. Neutral RGB picks lose their chroma and
  fall back to hue zero, producing pink. The original grayscale mode is not
  exposed by this adapter.

The same review confirmed strong body-text contrast across all 360 × 360 text
and surface hue pairs: the panel minimum was approximately APCA Lc 89.7. These
results support the text-table design, not a claim that every control is covered.
Dark ink on step-7 accent fills measured WCAG contrast 5.12–7.06 and APCA Lc
36.8–48.5 across the hue wheel. Button typography and fill lightness need their
own design decision; changing the ink alone does not satisfy both targets.

The implementation is in `vendor/bluepinkneon/palette.ts`, `apca-lookup.ts`,
`okcolor.ts`, and the Buzz adapter in `runtime.js`.
