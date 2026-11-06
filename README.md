# OKLCHAPCA for Buzz

<img src="icon.png" alt="OKLCHAPCA's blue, pink and neon color wheel" width="96" height="96">

**Three choices. A full theme, built on OKLCH and APCA.**

OKLCHAPCA is a palette generator and theme selector for [Buzz](https://github.com/block/buzz-app).
Deep purple surfaces, blue selections, pink accents, and neon text—plus controls
to make the palette your own.

## Install

Requires Buzz Desktop with API v1 external-plugin support. No development tools
are needed to install the plugin.

1. Open **Settings → Plugins → Manage plugins → Add**.
2. In **Git or GitHub repository**, enter:
   `https://github.com/bluepinkneon/buzz-oklchapca`
3. Set the branch/tag to **v1.0.1**, choose **Find**, then select **dist**.
4. Review and install **OKLCHAPCA**. Enable it if your Buzz version leaves new
   plugins disabled.
5. Close Settings and open **Themes**, directly below **Inbox** in the sidebar.

Or open this Buzz install URL from a browser or link-capable app:

```text
buzz://plugin-install?repository=bluepinkneon%2Fbuzz-oklchapca&ref=v1.0.1&path=dist
```

GitHub may not make custom-protocol links clickable. On macOS, the equivalent is:

```sh
open 'buzz://plugin-install?repository=bluepinkneon%2Fbuzz-oklchapca&ref=v1.0.1&path=dist'
```

For a folder install, download the ZIP from [Releases](https://github.com/bluepinkneon/buzz-oklchapca/releases),
extract it, then choose **Add → Browse** and select the extracted plugin folder.

The name combines **OKLCH** (the perceptual color space) and **APCA** (the text-contrast method). Formerly Chroma; the plugin ID and saved preferences are preserved.

## Make a palette

- **Theme:** switch between BluePinkNeon and Buzz's original appearance.
- **Three color pickers:** select primary, secondary and neon-accent hues.
- **Hue rotation:** rotate the palette with the slider or **Rotate +45°**.
- **Reset BluePinkNeon:** return to the original Shepherd palette.

The pickers choose hue; the generator chooses chroma and lightness. The original
generator uses OKLCH ramps and hue-adaptive APCA lightness tables. These are text
contrast targets, not a guarantee for every Buzz component or custom combination.
Preferences stay on this device and survive app restarts.

## Restore Buzz's appearance

Choose **Buzz default** on the Themes page, or disable OKLCHAPCA under
**Settings → Manage plugins**. Both remove the plugin-owned stylesheet. Your
saved Buzz appearance preferences are not changed.

## Compatibility and access

This is an opt-in app-wide CSS color override, not a Buzz core theme API. It keeps
Buzz's fonts, spacing and layout. Changes to Buzz's semantic color roles can
require plugin updates. BluePinkNeon is a dark palette even if Buzz is set to
System or Light.

The code makes no network requests and uses no host command, process, filesystem,
account or message APIs. It stores only its preference under the namespaced
`com.ranveer.bluepinkneon:theme:v2` localStorage key. Buzz plugins run in the app's
JavaScript context; they are not sandboxed. This release is unsigned and Buzz
will show its normal external-plugin review.

## Build and check

Use Python 3, npm, Node.js 24+ and Bun 1.3.14. The generated module is checked in
under `dist/`, so people installing it do not build anything.

```sh
npm run check
```

`build.py` verifies the original palette-generator files and Shepherd CSS
snapshot by SHA-256, installs pinned culori 4.0.2 in an automatically removed OS
temporary directory, and bundles a single browser ES module. No runtime imports,
separate stylesheets or assets are needed by Buzz.

- `runtime.js`: plugin lifecycle, theme controls and validated local preference.
- `buzz-roles.css`: Buzz semantic color-role mapping.
- `shepherd-theme.css`: original palette snapshot; only color tokens are used.
- `vendor/bluepinkneon/`: original OKLCH/APCA generator and source provenance.
- `test/`: default-palette parity, controls, persistence, cleanup and validation.

## How the algorithm works

See [ALGORITHM.md](https://github.com/bluepinkneon/buzz-oklchapca/blob/main/ALGORITHM.md) for the hue wheel, shade steps and contrast targets.
It also records the current adapter's status-color, preset-transition and picker
limitations found in an independent review.

## License

MIT. The original BluePinkNeon palette generator is published here by its owner.
The bundled culori dependency is MIT; its notice is included in `dist/`.

Independent plugin; not an official Buzz release or marketplace endorsement.
