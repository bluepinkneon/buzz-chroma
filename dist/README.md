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
3. Select tag **v1.1.0**, choose **Find**, then select **dist**.
4. Review and install **Color Overthinkers**, then enable it.
5. Close Settings and open **Themes**, directly below **Inbox**.

On macOS you can open the install review with:

```sh
open 'buzz://plugin-install?repository=bluepinkneon%2Fbuzz-chroma&ref=v1.1.0&path=dist'
```

Or download the folder ZIP from [Releases](https://github.com/bluepinkneon/buzz-chroma/releases),
extract it, and select it with **Add → Browse**. Existing folder installs can
reload the updated source through Manage plugins.

## Make a palette

- **Full color:** choose primary, secondary and text hues; rotate them together.
- **Monochrome:** choose one hue for every decorative role. **Neutral gray** is
  the same mode at zero chroma. Alerts retain familiar signal colors.
- A gray pick in a full-color picker makes only that family neutral.
- **Light / Dark:** independently computed surfaces and contrast-checked inks.
- **Auto:** follows Buzz’s resolved appearance, including its System setting and
  OS day/night schedule. It does not impose a sunrise timer or change Buzz’s saved
  preference. If Buzz supplies no resolved mode, it follows the OS directly.
- **Reset BluePinkNeon:** resets the three hues, rotation and dark appearance.
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

## Let another Buzz plugin change the theme

The lifecycle-owned Cordis service is named **chroma**. Consumer example:

```js
export const inject = ["chroma"];
export function apply(ctx) {
  ctx.effect(() => ctx.chroma.setLook({
    colors: ["#0099dd", "#dd4083", "#95fae4"],
    rotation: 45,
    appearance: "auto", // dark | light | auto
    mode: "color",      // color | monochrome
    // monochrome: "#808080", // optional one-hue/neutral override
  }));
}
```

`setLook(options)` returns an idempotent disposer. Last active caller wins;
disposing it restores the previous active caller, then the saved user palette.
Overrides do not write preferences. Changing a UI control cancels all external
overrides. Disabling the provider removes the service and its dependent plugins.
Invalid values throw before changing the theme. Rotation accepts any finite
angle and normalizes to whole degrees; colors are six-digit hexadecimal. Explicit
colors/monochrome supply base hues when an explicit rotation is included.
Without an explicit angle, a monochrome color renders as picked while preserving
the saved full-color rotation, matching the UI.

`getLook()` returns a copy of the active settings and resolved appearance.
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
- `vendor/bluepinkneon/`: unchanged original generator with hash provenance.
- `shepherd-theme.css`: original 152-color snapshot.
- `test/role-graph.json`: authored graph based on Buzz’s public contrast checks.

## Compatibility and license

This is an opt-in CSS color override, not a Buzz core change. Buzz keeps its
spacing, typography and layout. New host roles may require updates; contrast
checks cover the documented graph, not every future plugin or arbitrary CSS.
The code makes no network requests. It saves only namespaced theme preferences
under `com.ranveer.bluepinkneon:theme:v3`. External plugins are reviewed by Buzz.

MIT. The original palette generator is published by its owner. Bundled culori
is MIT; its notice is included. Independent plugin, without marketplace endorsement.
