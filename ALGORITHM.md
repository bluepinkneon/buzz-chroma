# Color Overthinkers: the math

## Two layers, one palette

The original BluePinkNeon generator remains hash-pinned and unchanged. Its wheel
has eight hue positions at equal 45° intervals and twelve shades per family.
The Buzz adapter exposes Primary, Secondary and Neon colors, plus Hue rotation. Rotation
adds the same whole-degree angle to each hue, preserving their chosen offsets and
wrapping periodically through 359° → 0°.

The original three inputs were Anchor, ANSI Index (role-to-wheel permutation),
and Brand Index (position/shade). Three independent hue controls are a simpler
adapter model, not the same three original inputs.

Trichrome asks for all three. Monochrome asks for Primary and generates all three
decorative families at that hue, with contrast solved separately for each role.
Bichrome asks for Primary P and Secondary S, then derives Neon N in degrees:

```
N = wrap(round(P − 45√2 × sin((S − P) × π / 180)))
```

This is a smooth periodic aesthetic relationship, calibrated to the original
blue-pink-neon pair (224°, 359° → 179°) and within 1° of daredevil’s curated Neon
(25°, 280° → 86°). It does not reproduce every curated trichrome recipe or prove
universal color harmony. It preserves rotation and mirror symmetry, with no
shortest-arc jump at the circular seam. Complementary inputs derive the primary
hue again; a smooth mirror-symmetric periodic rule necessarily permits such a
coincidence. Tone and contrast still distinguish roles. One neutral seed lends
the other seed’s hue to Neon; two neutral seeds keep Neon neutral. Hidden
trichrome seeds survive mode switches.

The original raw shades and 152 default token values remain exact. ANSI magenta
and cyan now stay anchored to those original colors across rotation and color
modes, as do the four signal families; the names no longer collapse together in
monochrome. Black/white tones still follow the selected source families. Visible UI
roles intentionally change from v1 to satisfy the new contrast/state constraints;
raw-token parity is not a claim of pixel-for-pixel visible parity. The original
shade steps are deliberately not uniform: steps 0–7 use lightness
.045/.09/.135/.20/.28/.36/.44/.618, and text shades 8–10 use hue-adaptive APCA tables.
The .618 choice is aesthetic, not an accessibility theorem. The old sRGB-clamped
raw ramps remain available; the derived UI-role colors below are separately solved.

## Derived UI roles

We preserve the wheel but derive surfaces and inks for their actual jobs. New
colors reduce chroma into the sRGB gamut at fixed OKLCH lightness and hue before
rounding to eight-bit hex. This avoids changing hue through per-channel clipping.
Grayscale is exactly the same process at C=0; one-hue monochrome uses one common
hue. Signal roles are a deliberate exception: danger, warning, success and info
retain hue anchors from the original hand-tuned signal ramps. Danger/removal is
red, success/addition green, warning amber and information blue. Buzz’s diff
viewer uses those same success/danger roles; it has no amber modification token.
GitHub’s merged-state icons likewise retain categorical purple, with separate
ordinary/own-message contrast solves even in neutral monochrome.
This intentionally supersedes the historical raw diff aliases
for actual Buzz diff rendering, while leaving the historical palette data intact.

Prominent controls use dark L .86/.90/.94 with dark ink, and light L
.47/.43/.39 with light ink. These shared strong/inverse roles must also work for
Buzz’s inverse badges and call decisions. The unchecked switch’s thumb is bound
to standard ink over its subtle track. These actual host contexts are part of
the test graph, including call fills that Buzz also uses as foreground icons.

Explicit local `.dark`/`.light` contexts receive separately generated roles for
their own polarity. The main page’s mode is not forced onto fixed dark media
surfaces. Accent-preview subtrees remain host-owned.

The state ladder uses equal requested lightness increments of .035:

| State | Dark L | Light L |
|---|---:|---:|
| Panel | .200 | .985 |
| Hover / own message | .235 | .950 |
| Selected / own hover | .270 | .915 |
| Pressed / highlight | .305 | .880 |
| Own highlight / control selected | .340 | .845 |

Separate components may share a tone; competing states within a component do not.
Controls use rest/hover/pressed/selected tones at dark L .235/.270/.305/.340
and light L .950/.915/.880/.845. Navigation uses panel/hover/selected.
Primary and secondary hues can add further separation. In monochrome, selected
navigation adds an inset cue, links remain underlined and reactions keep rings.
Equal requested L does not mean exact perceptual equality after gamut mapping
and quantization. All-hue measurements give roughly ΔE_OK×100 of 3.25–4.20 for the
.035 state changes, with no special wrap discontinuity. The tests require ≥3 for
specified competing states, not global uniqueness of every CSS role.

## Solve ink against its actual backgrounds

Dark backgrounds need negative APCA polarity (light ink); light backgrounds need
positive polarity (dark ink). These are separate solves, not inverted hex values
or a reuse of the old dark-only lookup tables. The adapter’s solver retains a
passing endpoint, searches toward the requested target, then measures the actual
returned hex against every background in that ink’s context.

| Ink | Preferred APCA magnitude | Hard floor |
|---|---:|---:|
| Reading body, selected, own-message | 90 | 75 |
| Supporting text | 65 | 60 |
| Metadata | 50 | 50 |
| Links | 80 | 60 |
| Semantic signal text | 60 | 60 |

Signal inks maximize available chroma at their fixed hue, keeping red/green
recognizable instead of washing them toward gray to chase Lc75. The own-message
success icon has its own non-text solve.

Readable text also requires WCAG contrast≥4.5. Meaningful non-text boundaries use
3:1; decorative hairlines are not claimed to meet that threshold. If the preferred
APCA value is physically unavailable but the hard floors pass, the strongest
endpoint is used and reported in the engine measurements. If even a hard floor
is unavailable, generation throws rather than silently returning a weak color.
This can make light-mode body ink nearly black. APCA and WCAG measure different
properties; passing a numeric target is not a universal accessibility certification.

The public Buzz contrast graph is the coverage baseline (body Lc 60 / metadata 45
and WCAG4.5); our measured ink recipes are stronger. It includes selected rows,
popovers, own-message contexts, links, mentions, reactions and signal colors.
Arrival highlights animate an opaque overlay to transparent: we test the peak,
backing and intermediate alpha composites, including nested mentions/reactions.

## Preset relationships

Each recipe contains three hue anchors and a ground relationship: either primary
+90° (the original `blue-pink-neon`) or primary +0° (a ground in the primary’s
color family). This is data supplied to the same gamut/contrast engine, not a
second shade algorithm. It keeps `daredevil` red instead of olive and lets its
automatic monochrome version follow its red primary.

The relationship is stored and rotates with the hue anchors, so leaving the exact
preset does not introduce a special-case cliff. Old saved settings default to 90°.
The API exposes this field and accepts only 0 or 90. Character recipes may recommend
trichrome, bichrome or monochrome; explicit API mode overrides the recommendation. Light/Dark/
Auto is independent. A custom monochrome override persists until reset or a new
preset is selected; **Use primary hue** restores the link.

Red and green character palettes can deliberately share a hue with danger and
success. Those signal hues remain fixed; host labels, icons and diff +/- marks
carry meaning alongside color. Decorative colors are not an exclusive signal code.

## Stable picks and migration

A displayed raw step7 swatch is inverted through a 360-entry table of the same
rendered swatches, with circular hue distance and a nearest-current-hue tie-break.
Reselecting the displayed value is a no-op. Neutral RGB picks (C < .02) set only that
picker’s neutral flag; they do not turn the whole theme monochrome. All three
pickers use step7 for their controls; the preview shows the actual text ink.

The v2 third hue preceded the text hue by 45°; migration adds 45°, preserves rotation
and leaves v2 storage untouched. v3 records explicit palette/neutral/appearance
choices. Invalid JSON or values show a fallback warning. New semantic signals do
not rotate, eliminating the old exact-preset cliff and success/danger collisions.

## Local themes

The local library is separate from the active preference. A saved record contains
a capped kebab-case name and the palette settings, without a forced appearance.
It is bounded to 50 entries, 60 name characters, 2,048 characters per stored entry
and 131,072 characters for the library. It uses the shared preference validator,
rejects foreign fields and locks writes after a refused load, leaving invalid
stored data untouched until an explicit library reset. The same entry validator
runs on load and every write. Duplicate saves
receive new names rather than overwriting a built-in or another user theme.
Deleting a theme never removes the currently applied colors.

## Validation and limits

`npm run check` includes 3,506 full generated configurations and 1,998,420 role
contrast measurements, including all 360 rotations in all three modes in both
appearances plus independent hue/neutral-mask combinations. It also checks
picker idempotence, mode transitions, storage, service cleanup, equal state steps
and a 1,081,080-sample rendered luminance sweep. The two-input rule is tested over
all 129,600 hue pairs for rotation, mirror symmetry and bounded steps. Independent auditors additionally
checked 2,214,000 gamut-map samples without brightness reversals and all 360²
own/selected hue combinations for separation. The raw original default colors
remain hash-verified and exact.

These are finite tests plus runtime constraints, not an exhaustive proof over
all CSS, display hardware, eyesight, browser compositing or future host versions.
Whole-degree hue choices bound the hue domain. Equal hue angles are retained;
per-degree perceived distance is not guaranteed identical. Auto follows Buzz’s
resolved light/dark mode, using the OS preference only if the host supplies none.
It never writes Buzz’s mode preference or imposes a separate day/night clock.
