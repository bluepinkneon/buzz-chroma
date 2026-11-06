# Color Overthinkers: the math

## Two layers, one palette

The original BluePinkNeon generator remains hash-pinned and unchanged. Its wheel
has eight hue positions at equal 45° intervals and twelve shades per family.
The Buzz adapter exposes primary, secondary and text hues, plus rotation. Rotation
adds the same whole-degree angle to each hue, preserving their chosen offsets and
wrapping periodically through 359° → 0°.

The original three inputs were Anchor, ANSI Index (role-to-wheel permutation),
and Brand Index (position/shade). Three independent hue controls are a simpler
adapter model, not the same three original inputs.

The original raw shades and 152 default token values remain exact. The original
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
retain hue anchors from the original hand-tuned signal ramps.

The state ladder uses equal requested lightness increments of .035:

| State | Dark L | Light L |
|---|---:|---:|
| Panel | .200 | .985 |
| Hover / own message | .235 | .950 |
| Selected / own hover | .270 | .915 |
| Pressed / highlight | .305 | .880 |
| Own highlight | .340 | .845 |

Separate components may share a tone; competing states within a component do not.
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
| Semantic signal text | 75 | 75 |

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

## Validation and limits

`npm run check` includes 1,954 full generated configurations and 1,113,780 role
contrast measurements, including all 360 rotations and monochrome hues in both
appearances plus independent hue/neutral-mask combinations. It also checks
picker idempotence, mode transitions, storage, service cleanup, equal state steps
and a 1,081,080-sample rendered luminance sweep. Independent auditors additionally
checked 2,214,000 gamut-map samples without brightness reversals and all 360²
own/selected hue combinations for separation. The raw original default colors
remain hash-verified and exact.

These are finite tests plus runtime constraints, not an exhaustive proof over
all CSS, display hardware, eyesight, browser compositing or future host versions.
Whole-degree hue choices bound the hue domain. Equal hue angles are retained;
per-degree perceived distance is not guaranteed identical. Auto follows Buzz’s
resolved light/dark mode, using the OS preference only if the host supplies none.
It never writes Buzz’s mode preference or imposes a separate day/night clock.
