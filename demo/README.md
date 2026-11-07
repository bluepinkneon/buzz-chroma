# Colors video recipe

The scene runs the real compiled Colors plugin in Buzz's fictional demo workspace.
The agent reply is scripted; the demo driver finds Colors' registered Buzz tools
and calls their real handlers. No model provider, real account or real messages
are used. The visible palette, captions and window use the emitted theme roles.

`agent-driver/` is a recording-only helper, not another plugin to install.
Its manifest is a template so repository installers do not offer it as an option.
Stage that template as `manifest.json` in an OS temporary directory when recording.

With Buzz's plugin demo toolkit and its prepared app available:

```sh
COLORS_DEMO_DRIVER="$(mktemp -d)"
COLORS_DEMO_OUTPUT="$(mktemp -d)"
COLORS_DEMO_MEDIA="$(mktemp -d)"
cp demo/agent-driver/manifest.template.json "$COLORS_DEMO_DRIVER/manifest.json"
cp demo/agent-driver/plugin.js "$COLORS_DEMO_DRIVER/plugin.js"
node --experimental-transform-types --no-warnings "$BUZZ_DEMOS/scripts/record.mjs" \
  --app "$BUZZ_APP" --plugin ./dist --plugin "$COLORS_DEMO_DRIVER" \
  --scene demo/scene.mjs --seed demo/seed.json --out "$COLORS_DEMO_OUTPUT" \
  --width 1440 --height 810 --scale 1 --fps 30
./demo/render.sh "$COLORS_DEMO_OUTPUT" "$COLORS_DEMO_MEDIA"
```

The shipped video used Colors v1.6.0 (`797e59c9`) and Buzz `89e2d157`.
The capture is 1440×810 at 1×; the render recipe scales it to 1920×1080 and
converts BT.601 full-range frames to limited-range BT.709 H.264. It also makes
the opening GIF and the poster. Record output must have no blocked requests or
page errors before publication. Generated media stays outside the Git repository.
