# Color Overthinkers for Buzz

<img src="icon.png" alt="Blue, pink and neon color wheel" width="96" height="96">

**We’ve already overthought it for you.**

Choose one, two or three colors. Get a complete Buzz palette in **Dark**, **Light**, or
**Auto**. Grayscale is monochrome with zero chroma. The repository is Buzz Chroma;
the plugin keeps its original ID, so existing installations and preferences migrate.

## Install

Requires Buzz Desktop with API v1 external-plugin support.

1. Open **Settings → Manage plugins → Add**.
2. Enter `https://github.com/bluepinkneon/buzz-chroma`.
3. Set the branch/reference to **main**, choose **Find**, then select **dist**.
4. Review and install **Color Overthinkers**, then enable it.
5. Close Settings and open **Themes**, directly below **Inbox**.

On macOS you can open the install review with:

```sh
open 'buzz://plugin-install?repository=bluepinkneon%2Fbuzz-chroma&ref=main&path=dist'
```

### Update an existing GitHub install

Open **Settings → Manage plugins → Color Overthinkers → Update**. Use the same
repository, reference **main**, and folder **dist**, then **Find → review → Update**.
A GitHub install is pinned to the reviewed commit; pushing here does not hot-reload
an installed copy. The new screen shows **Trichrome / Bichrome / Monochrome** and
**Neon**. Reinstalling an old version tag keeps that old version. For a fixed
release instead, select a tag from [Releases](https://github.com/bluepinkneon/buzz-chroma/releases).

Or download the folder ZIP from [Releases](https://github.com/bluepinkneon/buzz-chroma/releases),
extract it, and select it with **Add → Browse**. Existing folder installs can
reload the updated source through Manage plugins.

## Character palettes

`blue-pink-neon` is Ranveer’s original. The other 39 are character-inspired,
with a mix of comics, film, books, games and animation. Names use kebab-case:
`daredevil` is one word; `blue-pink-neon` keeps the three words.

<details>
<summary>All 40 palettes and their default looks</summary>

| Palette | Default | Color idea |
|---|---|---|
| `blue-pink-neon` | trichrome | Ranveer’s original: blue, pink and neon. |
| `daredevil` | bichrome | Crimson, violet and gold. |
| `spider-man` | trichrome | Comic-book red, electric blue and gold. |
| `black-widow` | bichrome | Crimson and charcoal bichrome; ice in trichrome. |
| `black-panther` | trichrome | Royal violet, gold and ice. |
| `storm` | monochrome | Storm-cloud indigo monochrome; lightning gold and sea glass in trichrome. |
| `john-wick` | trichrome | Midnight violet, neon cyan and gold. |
| `miyamoto-musashi` | monochrome | Ink-indigo monochrome; cedar and bamboo green in trichrome. |
| `sherlock-holmes` | monochrome | Sepia monochrome; ink blue and bottle green in trichrome. |
| `trinity` | monochrome | Jade monochrome; ultraviolet and gold in trichrome. |
| `neo` | monochrome | Phosphor-green monochrome; blue and gold in trichrome. |
| `aragorn` | trichrome | Ranger green, worn burgundy and steel blue. |
| `lara-croft` | trichrome | Expedition teal, sandstone and orchid. |
| `wonder-woman` | trichrome | Royal blue, crimson and gold. |
| `katniss-everdeen` | trichrome | Mockingjay gold, ember and cold silver-blue. |
| `princess-leia` | trichrome | Indigo, rose and mint. |
| `ripley` | trichrome | Industrial teal, warning amber and deep violet. |
| `geralt-of-rivia` | monochrome | Steel-blue monochrome; crimson and gold in trichrome. |
| `wolverine` | trichrome | Battle yellow, cobalt blue and claw-mark red. |
| `batman` | bichrome | Charcoal and signal gold, with a matching reading-ink tint. |
| `superman` | trichrome | Sky blue, cape red and sunlit gold. |
| `harley-quinn` | trichrome | Scarlet, hot pink and electric cyan. |
| `deadpool` | trichrome | Mercenary red, steel blue and mint. |
| `joker` | trichrome | Acid green, theatrical violet and brass. |
| `doctor-strange` | trichrome | Mystic violet, cloak red and spell gold. |
| `ahsoka-tano` | trichrome | Warm copper, saber cyan and indigo. |
| `obi-wan-kenobi` | trichrome | Desert ochre, saber blue and sage. |
| `darth-vader` | bichrome | Charcoal and saber red, with a matching reading-ink tint. |
| `frodo-baggins` | trichrome | Shire-leaf green, weathered leather and twilight blue. |
| `gandalf` | bichrome | Soft gray and icy blue, with a matching reading-ink tint. |
| `legolas` | trichrome | Woodland green, pale gold and clear blue. |
| `hermione-granger` | trichrome | Scholarly crimson, parchment gold and ink blue. |
| `howl` | trichrome | Enchanted violet, rose and starlight gold. |
| `san` | trichrome | War-paint red, deep forest and cold sky. |
| `motoko-kusanagi` | trichrome | Cybernetic orchid, neon teal and amber. |
| `totoro` | bichrome | Soft gray and forest green, with a matching reading-ink tint. |
| `chun-li` | trichrome | Royal blue, gold and a pink spark. |
| `link` | trichrome | Champion teal, relic gold and open-sky blue. |
| `zelda` | trichrome | Royal indigo, sacred gold and jade. |
| `samus-aran` | trichrome | Armor orange, cosmic violet and visor green. |

</details>

Some open in monochrome, others in bichrome or trichrome. Every palette supports
all three modes, plus Light/Dark/Auto. Monochrome follows Primary automatically. Pick a
custom monochrome hue, or open **Monochrome options → Use primary hue** to link it again. Selecting
a built-in palette restores its recommended color mode and hue relationships,
while keeping your appearance preference.

## Make a palette

- **Trichrome:** choose **Primary**, **Secondary** and **Neon**.
- **Bichrome:** choose **Primary** and **Secondary**; Neon is derived automatically.
- **Monochrome:** choose **Primary** for every decorative family. **Neutral gray** is
  the same mode at zero chroma. Alerts retain familiar signal colors.
- **Hue rotation:** the bottom slider rotates the whole look in every mode. Editing
  a color keeps this angle and leaves unedited colors unchanged.
- A gray pick makes only that family neutral. Two gray bichrome inputs also make
  the derived Neon neutral; one gray input borrows the other input’s hue.
- **Light / Dark:** independently computed surfaces and contrast-checked inks.
- **Auto:** follows Buzz’s resolved appearance, including its System setting and
  OS day/night schedule. It does not impose a sunrise timer or change Buzz’s saved
  preference. If Buzz supplies no resolved mode, it follows the OS directly.
- **More color options → Reset blue-pink-neon:** restores the original colors,
  trichrome mode, rotation, neutral flags, ground relationship and dark appearance.
- **Buzz default**, or disabling the plugin, removes its owned style override.

The RGB controls select a hue or a neutral family; the generator owns
lightness and chroma. Their displayed swatches round-trip without hue drift.
Neon supplies the reading-ink tint; its picker shows a hue swatch and the preview
shows the actual ink. Hidden trichrome choices survive a visit to another mode.
In Light mode, ink can approach black when higher contrast requires it.

Danger/removal stays red, success/addition green, and warning amber. Buzz’s diff
viewer consumes those same semantic roles. It has no independent modification
color: modifications are insertion/deletion hunks.

Selected, hovered and pressed states use separate tones. Monochrome selections
also retain an inset stripe; links keep Buzz’s underlines and reactions its rings.
Preferences are local to this device. Older preferences migrate without deleting
the old rollback key.

## See what the controls generate

Below the pickers and rotation bar:

- **Palette:** eight named families, with twelve source shades in each. Hover a
  shade to see its name, index and hex value.
- **Console colors:** all sixteen normal/bright ANSI colors, labeled with names
  and hex values. This previews the source palette; it does not change a separate
  terminal application.
- **Status and diffs:** the actual contrast-solved Buzz success/addition,
  danger/removal, warning and information inks, backgrounds and icon colors.

The source ramps and console colors are the original generator’s output. Buzz UI
roles are separately solved for the selected Light/Dark appearance; raw ramps
are not a claim that every shade can be used as text on every background.
Choosing **Buzz default** removes the plugin override and its generated preview.

## Save your own themes

Expand **Save your theme**, enter a name, then choose **Save locally**. The name
becomes kebab-case. Saved themes appear in the selector under **Saved on this
device**, and survive app restarts. They restore palette and color-mode settings while
keeping your current Light/Dark/Auto preference. Duplicate names receive a
suffix; built-ins and earlier saves are never overwritten. **Remove saved theme**
removes the local copy and keeps the current colors as an unsaved look.

If the stored library is unreadable, Save/Remove stay locked to protect it. Only
the explicit **Reset local library** button clears those stored bytes.

If saving fails, the library remains usable for the current session and keeps
an unsaved-changes notice visible. A later successful library save writes those
session changes too. If another window changes the stored library, a stale window
refuses to overwrite it; reload the plugin before saving again.

Up to 50 themes are stored in the device’s localStorage. Nothing is uploaded.
Disabling the plugin keeps them; clearing app/site data can remove them.

## Callable API for other Buzz plugins

This is an in-process Cordis service named **chroma**, not an HTTP endpoint.
Require it with `export const inject = ["chroma"]`, then use `ctx.chroma`.
The service has `version: 1` and four methods:

| Method | Returns | Effect |
|---|---|---|
| `listPresets()` | A fresh array of all built-in recipes | No changes |
| `getLook()` | A fresh snapshot of the currently displayed look | No changes |
| `generateTheme(options = {})` | `Record<string, "#RRGGBB">` containing 149 Buzz CSS roles | Generates only; does not apply or save |
| `setLook(options)` | A callable live handle with `update(patch)` and `dispose()` | Applies a temporary look; does not save |

Each new `setLook` and `generateTheme` request starts from the **saved user look**
for omitted fields, independently of other temporary handles. A handle’s
`update` starts from that handle’s own current state. To deliberately copy a
visible temporary look, pass `getLook()` as a complete snapshot.

```js
export const inject = ["chroma"];
export function apply(ctx) {
  ctx.effect(() => {
    const live = ctx.chroma.setLook({
      preset: "john-wick",
      appearance: "auto",
      mode: "trichrome",
    });
    // An event handler can update this same handle without stacking overrides:
    live.update({ mode: "bichrome", colors: ["#0099dd", "#dd4083"] });
    live.update({ rotation: 45 });
    return () => live.dispose();
  });
}
```

### Options and precedence

| Option | Values / behavior |
|---|---|
| `preset` | A built-in ID from `listPresets()`. Sets its palette, ground relationship and recommended mode; retains appearance. |
| `mode` | `monochrome`, `bichrome`, `trichrome`. Snapshot IDs `mono`, `duo`, `color` also work; `dichrome` aliases bichrome. |
| `colors` | Six-digit hex inputs: one for monochrome, two for bichrome, three for trichrome. All modes also accept a complete three-seed array. |
| `rotation` | Any finite number, normalized to a whole degree modulo 360. |
| `appearance` | `dark`, `light`, `auto`. Auto follows Buzz’s resolved mode, with an OS fallback. |
| `monochrome` | A single hex override that enters monochrome. Do not combine it with an explicit non-mono mode or a one-color `colors` array. |
| `surfaceOffset` | `0` for a primary-colored ground, `90` for the original quarter-wheel ground. Omitted values keep the base recipe. |

A preset is applied first, then explicit options override it. RGB inputs choose
a hue or neutral family, not exact output brightness. Without an explicit
`rotation`, colors render as picked and the current angle is kept. With an
explicit `rotation`, supplied colors are base hues under that angle. Only supplied
seeds change; hidden trichrome choices and custom monochrome choices are kept.
A three-seed array changes the stored seeds; a custom monochrome override stays
active until replaced, **Use primary hue**, reset, or a new preset selection.

```js
const cssRoles = ctx.chroma.generateTheme({
  mode: "bichrome", colors: ["#cc2233", "#3355ff"], appearance: "light",
}); // colors only; nothing applied
const live = ctx.chroma.setLook({ mode: "monochrome", colors: ["#cc2233"] });
live.update({ appearance: "light" }); // returns undefined
live.dispose();                     // returns undefined; idempotent
// live() is the equivalent callable cleanup form.
```

The newest **live handle by creation order** wins. Updating an older handle does
not raise its priority. Disposing a middle handle leaves the newest unchanged;
disposing the newest reveals the previous live handle, then the saved user look.
A UI change takes ownership: it saves the visible look with the person’s edit,
cancels all temporary handles, and prevents old handles from being revived.
`update` on a disposed/cancelled handle throws. Disabling the provider removes
its service and deactivates consumers that require it; it does not uninstall them.
All four methods throw after disable; old disposers remain harmless.

All API inputs are validated. Unknown fields, unsupported modes, malformed colors,
non-finite angles and conflicting options throw before changing the look. Returned
arrays/objects and accepted snapshots are isolated from caller mutation. External
overrides never write preferences or the local theme library.

### Snapshot and preset records

`getLook()` returns these settings and derived metadata:

| Fields | Meaning |
|---|---|
| `theme` | `bluepinkneon` or `default` (Buzz’s own appearance) |
| `hues`, `rotation`, `neutrals` | Three stored seed angles, shared rotation, and per-seed neutral flags |
| `mode` | Stable snapshot ID `color`, `duo` or `mono` |
| `monoHue`, `neutral` | Optional unrotated mono override (`null` links Primary), and neutral-gray choice |
| `appearance`, `surfaceOffset`, `localName` | Appearance preference, ground relationship, saved local name or `null` |
| `preset` | Underlying recipe ID at zero rotation, or `custom`; it identifies palette seeds, not the selected mode |
| `effectiveHues`, `effectiveNeutrals` | Three resulting hues and neutral flags after mode/rotation derivation; hue is irrelevant for a neutral family |
| `resolvedAppearance` | Last applied `dark` or `light` appearance |

Complete snapshots replace settings and can round-trip through `setLook` or
`live.update`. Derived metadata is shape-checked, then ignored and recomputed;
it never overrides the stored settings. `generateTheme` always generates the
plugin palette, even from a `theme: "default"` snapshot; it does not introspect
Buzz’s own theme. It returns only semantic CSS roles, not a CSS string, source
ramps, ANSI exports or solver measurements.

```js
const snapshot = ctx.chroma.getLook();
const live = ctx.chroma.setLook(snapshot); // exact same palette
live.update({ mode: snapshot.mode });     // snapshot IDs also work in patches
live.dispose();
```

Each `listPresets()` entry contains `id`, `description`, three `hues`, three
`neutrals`, `surfaceOffset`, `defaultMode` (`color`/`duo`/`mono`) and
`defaultNeutral` (currently always `false`). Mutating the returned catalog never changes built-ins.
The API grants no messages, account, filesystem or network access. Buzz plugins
share a trusted JavaScript context; the service is not a security sandbox.

## Math and checks

```sh
npm run check
```

Python 3, npm, Node.js 24+ and Bun 1.3.14 build one self-contained browser module.
The build verifies the pinned original generator and CSS snapshot by SHA-256,
uses culori 4.0.2 in an automatically removed temporary directory, and checks in
the result under `dist/`. Installers do not need build tools.

Tests cover all 360 hue positions in trichrome, bichrome and monochrome, both appearances,
neutral families, independent hue combinations, the circular seam, picker
round-trips, storage migration, Auto changes, callable-service custody and cleanup.
The host text/background graph also samples animated highlight composites.
See [ALGORITHM.md](https://github.com/bluepinkneon/buzz-chroma/blob/main/ALGORITHM.md) for the constraints, numeric floors and limits.

- `runtime.js`: controls, validated preferences, lifecycle and callable service.
- `role-engine.js`: polarity-aware contrast solving and gamut mapping.
- `role-map.js`: Buzz semantic role mapping and monochrome state cues.
- `presets.js`: original character-inspired recipes.
- `local-themes.js`: bounded local palette snapshots and names.
- `harmony.js`: periodic two-input Neon derivation.
- `palette-preview.js`: labeled palette, console and semantic-color previews.
- `vendor/bluepinkneon/`: unchanged original generator with hash provenance.
- `shepherd-theme.css`: original 152-color snapshot.
- `test/role-graph.json`: authored graph based on Buzz’s public contrast checks.

## Changes in v1.2.1

- Color edits keep the rotation angle; colors-only API calls no longer reset it
  to zero. Hidden seeds and monochrome overrides no longer drift during edits.
- New live handles start from the saved user palette instead of inheriting a
  different plugin’s temporary override.
- Snapshot IDs work in mode patches; snapshots own their arrays; ambiguous input
  combinations are rejected; derived neutral flags are available in snapshots.
- Failed library saves remain visibly unsaved; stale windows refuse to overwrite
  another window’s saved themes. Future built-in names cannot lock local saves.
- A theme-colored SVG outline in the sidebar and a transparent color-wheel icon
  in the plugin details.
- Cleaner pickers/rotation, labeled palette and console previews, and current API
  reference and GitHub update instructions.

Version 1.1.0 cannot read bichrome settings in the v3 preference key; downgrading
falls back to its default palette. Upgrade forward for all three modes. Older v2
preferences remain untouched for rollback.

## Compatibility and license

This is an opt-in CSS color override, not a Buzz core change. Buzz keeps its
spacing, typography and layout. New host roles may require updates; contrast
checks cover the documented graph, not every future plugin or arbitrary CSS.
The code makes no network requests. It saves only namespaced theme preferences
under `com.ranveer.bluepinkneon:theme:v3` and a bounded local library under
`com.ranveer.bluepinkneon:presets:v1`. External plugins are reviewed by Buzz.

MIT. The original palette generator is published by its owner. Bundled culori
is MIT; its notice is included. Independent plugin, without marketplace endorsement.
