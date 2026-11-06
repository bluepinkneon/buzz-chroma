# Color Overthinkers for Buzz

<img src="icon.png" alt="Blue, pink and neon color wheel" width="96" height="96">

**We’ve already overthought it for you.**

Choose three hues, or one. Get a complete Buzz palette in **Dark**, **Light**, or
**Auto**. Grayscale is monochrome with zero chroma. The repository is Buzz Chroma;
the plugin keeps its original ID, so existing installations and preferences migrate.

## Install

Requires Buzz Desktop with API v1 external-plugin support.

1. Open **Settings → Manage plugins → Add**.
2. Enter `https://github.com/bluepinkneon/buzz-chroma`.
3. Select tag **v1.2.0**, choose **Find**, then select **dist**.
4. Review and install **Color Overthinkers**, then enable it.
5. Close Settings and open **Themes**, directly below **Inbox**.

On macOS you can open the install review with:

```sh
open 'buzz://plugin-install?repository=bluepinkneon%2Fbuzz-chroma&ref=v1.2.0&path=dist'
```

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
| `blue-pink-neon` | three colors | Ranveer’s original: blue, pink and neon. |
| `daredevil` | three colors | Crimson, violet and gold. |
| `spider-man` | three colors | Comic-book red, electric blue and gold. |
| `black-widow` | monochrome | Crimson monochrome; violet and ice in full color. |
| `black-panther` | three colors | Royal violet, gold and ice. |
| `storm` | monochrome | Storm-cloud indigo monochrome; lightning gold and sea glass in full color. |
| `john-wick` | three colors | Midnight violet, neon cyan and gold. |
| `miyamoto-musashi` | monochrome | Ink-indigo monochrome; cedar and bamboo green in full color. |
| `sherlock-holmes` | monochrome | Sepia monochrome; ink blue and bottle green in full color. |
| `trinity` | monochrome | Jade monochrome; ultraviolet and gold in full color. |
| `neo` | monochrome | Phosphor-green monochrome; blue and gold in full color. |
| `aragorn` | three colors | Ranger green, worn burgundy and steel blue. |
| `lara-croft` | three colors | Expedition teal, sandstone and orchid. |
| `wonder-woman` | three colors | Royal blue, crimson and gold. |
| `katniss-everdeen` | three colors | Mockingjay gold, ember and cold silver-blue. |
| `princess-leia` | three colors | Indigo, rose and mint. |
| `ripley` | three colors | Industrial teal, warning amber and deep violet. |
| `geralt-of-rivia` | monochrome | Steel-blue monochrome; crimson and gold in full color. |
| `wolverine` | three colors | Battle yellow, cobalt blue and claw-mark red. |
| `batman` | neutral + accent | Charcoal and signal gold, with neutral reading ink. |
| `superman` | three colors | Sky blue, cape red and sunlit gold. |
| `harley-quinn` | three colors | Scarlet, hot pink and electric cyan. |
| `deadpool` | three colors | Mercenary red, steel blue and mint. |
| `joker` | three colors | Acid green, theatrical violet and brass. |
| `doctor-strange` | three colors | Mystic violet, cloak red and spell gold. |
| `ahsoka-tano` | three colors | Warm copper, saber cyan and indigo. |
| `obi-wan-kenobi` | three colors | Desert ochre, saber blue and sage. |
| `darth-vader` | neutral + accent | Charcoal and saber red, with neutral reading ink. |
| `frodo-baggins` | three colors | Shire-leaf green, weathered leather and twilight blue. |
| `gandalf` | neutral + accent | Soft gray and icy blue, with neutral reading ink. |
| `legolas` | three colors | Woodland green, pale gold and clear blue. |
| `hermione-granger` | three colors | Scholarly crimson, parchment gold and ink blue. |
| `howl` | three colors | Enchanted violet, rose and starlight gold. |
| `san` | three colors | War-paint red, deep forest and cold sky. |
| `motoko-kusanagi` | three colors | Cybernetic orchid, neon teal and amber. |
| `totoro` | neutral + accent | Soft gray and forest green, with neutral reading ink. |
| `chun-li` | three colors | Royal blue, gold and a pink spark. |
| `link` | three colors | Champion teal, relic gold and open-sky blue. |
| `zelda` | three colors | Royal indigo, sacred gold and jade. |
| `samus-aran` | three colors | Armor orange, cosmic violet and visor green. |

</details>

Some open in monochrome, others in full color. Every palette supports both,
plus Light/Dark/Auto. Monochrome follows the primary hue automatically. Pick a
custom monochrome hue, or choose **Use primary hue** to link it again. Selecting
a built-in palette restores its recommended color mode and hue relationships,
while keeping your appearance preference.

## Make a palette

- **Full color:** choose primary, secondary and text hues; rotate them together.
- **Monochrome:** choose one hue for every decorative role. **Neutral gray** is
  the same mode at zero chroma. Alerts retain familiar signal colors.
- A gray pick in a full-color picker makes only that family neutral.
- **Light / Dark:** independently computed surfaces and contrast-checked inks.
- **Auto:** follows Buzz’s resolved appearance, including its System setting and
  OS day/night schedule. It does not impose a sunrise timer or change Buzz’s saved
  preference. If Buzz supplies no resolved mode, it follows the OS directly.
- **Reset blue-pink-neon:** resets the three hues, rotation and dark appearance.
- **Buzz default**, or disabling the plugin, removes its owned style override.

The three RGB controls select a hue or a neutral family; the generator owns
lightness and chroma. Their displayed swatches round-trip without hue drift.
The Text picker shows its hue swatch; the preview shows the actual reading ink.
In Light mode, ink can approach black when higher contrast requires it.

Danger/removal stays red, success/addition green, and warning amber. Buzz’s diff
viewer consumes those same semantic roles. It has no independent modification
color: modifications are insertion/deletion hunks.

Selected, hovered and pressed states use separate tones. Monochrome selections
also retain an inset stripe; links keep Buzz’s underlines and reactions its rings.
Preferences are local to this device. Older preferences migrate without deleting
the old rollback key.

## Save your own themes

Enter a name under **Save your theme**, then choose **Save locally**. The name
becomes kebab-case. Saved themes appear in the selector under **Saved on this
device**, and survive app restarts. They restore color/monochrome settings while
keeping your current Light/Dark/Auto preference. Duplicate names receive a
suffix; built-ins and earlier saves are never overwritten. **Remove saved theme**
removes the local copy and keeps the current colors as an unsaved look.

If the stored library is unreadable, Save/Remove stay locked to protect it. Only
the explicit **Reset local library** button clears those stored bytes.

Up to 50 themes are stored in the device’s localStorage. Nothing is uploaded.
Disabling the plugin keeps them; clearing app/site data can remove them.

## Let another Buzz plugin change the theme

The lifecycle-owned Cordis service is named **chroma**. Consumer example:

```js
export const inject = ["chroma"];
export function apply(ctx) {
  ctx.effect(() => ctx.chroma.setLook({
    preset: "john-wick", // optional built-in ID
    // colors: ["#0099dd", "#dd4083", "#95fae4"],
    rotation: 45,
    appearance: "auto", // dark | light | auto
    mode: "color",      // color | monochrome
    // monochrome: "#808080", // optional one-hue/neutral override
  }));
}
```

`setLook(options)` returns a live handle that is also an idempotent disposer:

```js
const live = ctx.chroma.setLook({ preset: "john-wick" });
live.update({ rotation: 90 });
live.update({ mode: "monochrome", monochrome: "#cc2233" });
live.update({ appearance: "light" });
live.dispose(); // equivalent to live()
```

`update(patch)` changes the same override synchronously; it does not stack a new
override or save to storage. Each patch uses that handle’s own current settings.
Priority follows handle creation order, so an older handle cannot steal priority
by updating. Updating a disposed handle, or one cancelled by a UI action, throws.
Invalid updates leave the current look untouched. Last active caller wins;
disposing it restores the previous active caller, then the saved user palette.
Overrides do not write preferences. Changing a UI control cancels all external
overrides. Disabling the provider removes the service and its dependent plugins.
Invalid values throw before changing the theme. Rotation accepts any finite
angle and normalizes to whole degrees; colors are six-digit hexadecimal. Explicit
colors/monochrome supply base hues when an explicit rotation is included.
Without an explicit angle, a monochrome color renders as picked while preserving
the saved full-color rotation, matching the UI.

`listPresets()` returns a copy of the built-in catalog. `getLook()` returns a
copy of the active settings and resolved appearance. Its `preset` identifies the
underlying three-color recipe; mode and monochrome overrides can differ. A complete `getLook()`
snapshot can be passed back to `setLook()` without changing its colors.
`surfaceOffset` is the relationship recipe, either `0` (primary-colored ground)
or `90` (the original quarter-wheel ground). It is returned in snapshots and may
be supplied explicitly. Colors-only calls retain the current recipe. A preset
sets its recipe first; explicit options then override it.
`generateTheme(options)` returns a copy of generated Buzz CSS role colors without
applying them. `version` is `1`. These functions give no access to messages,
accounts, the filesystem, or the network. Plugins share the app’s trusted
JavaScript context; this is not a security sandbox.

The original hue palette stays intact as source data. The visible UI is a new
contrast-checked adaptation; it is intentionally not a pixel-for-pixel v1 skin.

## Math and checks

```sh
npm run check
```

Python 3, npm, Node.js 24+ and Bun 1.3.14 build one self-contained browser module.
The build verifies the pinned original generator and CSS snapshot by SHA-256,
uses culori 4.0.2 in an automatically removed temporary directory, and checks in
the result under `dist/`. Installers do not need build tools.

Tests cover all 360 hue positions in color and monochrome, both appearances,
neutral families, independent hue combinations, the circular seam, picker
round-trips, storage migration, Auto changes, callable-service custody and cleanup.
The host text/background graph also samples animated highlight composites.
See [ALGORITHM.md](ALGORITHM.md) for the constraints, numeric floors and limits.

- `runtime.js`: controls, validated preferences, lifecycle and callable service.
- `role-engine.js`: polarity-aware contrast solving and gamut mapping.
- `role-map.js`: Buzz semantic role mapping and monochrome state cues.
- `presets.js`: original character-inspired recipes.
- `local-themes.js`: bounded local palette snapshots and names.
- `vendor/bluepinkneon/`: unchanged original generator with hash provenance.
- `shepherd-theme.css`: original 152-color snapshot.
- `test/role-graph.json`: authored graph based on Buzz’s public contrast checks.

## Compatibility and license

This is an opt-in CSS color override, not a Buzz core change. Buzz keeps its
spacing, typography and layout. New host roles may require updates; contrast
checks cover the documented graph, not every future plugin or arbitrary CSS.
The code makes no network requests. It saves only namespaced theme preferences
under `com.ranveer.bluepinkneon:theme:v3` and a bounded local library under
`com.ranveer.bluepinkneon:presets:v1`. External plugins are reviewed by Buzz.

MIT. The original palette generator is published by its owner. Bundled culori
is MIT; its notice is included. Independent plugin, without marketplace endorsement.
