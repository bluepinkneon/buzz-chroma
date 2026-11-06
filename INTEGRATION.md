# Buzz integration

Audited against Buzz desktop **0.7.9**, source commit
[`8ad11326`](https://github.com/block/buzz-app/tree/8ad1132677ead08d346e4f381522c7297baf0dd7).
The audit follows actual CSS/JavaScript consumers, not just the names of generated
swatches. Static source coverage is not proof that every optional screen was
opened in the installed application.

| Surface | Connection |
| --- | --- |
| Navigation, messages, composer, menus and controls | Buzz semantic surface, text, state, focus and border roles |
| Diff additions/removals | Shared success/danger ink and fill roles, with the host’s `+`/`−` cues |
| Plain code blocks | Host panel and standard-text roles |
| Mermaid diagrams | Host’s CSS-variable bridge; independent of ANSI exports |
| Built-in terminal | Panel, standard text and accent selection, refreshed through root style changes |
| Huddles, presence and Todos | Contrast-solved call decisions, inverse labels and semantic status icons |
| Console swatches on Colors | Sixteen generated ANSI exports; not the terminal’s ANSI configuration |

The pinned terminal
[`appearance.ts`](https://github.com/block/buzz-app/blob/8ad1132677ead08d346e4f381522c7297baf0dd7/src/bundled/terminal/appearance.ts)
supplies background, foreground, cursor and selection but deliberately leaves
ANSI colors to xterm. Its
[`renderer.ts`](https://github.com/block/buzz-app/blob/8ad1132677ead08d346e4f381522c7297baf0dd7/src/bundled/terminal/renderer.ts)
watches root `style` changes. Chroma owns only the three consumed properties,
avoids identical writes and restores their prior values on disable/default.
No terminal private object, synthetic resize or Buzz source change is used.

The original source palette contains `--primary`, `--border` and `--danger`.
Buzz uses those names as legacy aliases. Chroma reconnects them to its generated
semantic roles so legacy inputs, upload progress and borders do not bypass the
contrast-solved UI palette. The original source ramps remain available for
previews and export.

Explicit local light/dark owners receive the corresponding generated polarity,
even when it differs from the main page. This preserves readable media controls
over a fixed black canvas. Buzz’s accent-preview subtrees keep their native
preview colors. Ordinary component-local role aliases are not flattened.
Raised composer controls retain their local context and take their three
interaction tones from the nearest generated light/dark palette.

Dark prominent fills are bright with dark ink; light prominent fills are dark
with light ink. The same inverse ink serves badges and incoming-call labels.
The public `.buzz-switch-control` uses a local semantic binding for its unchecked
thumb, because Buzz otherwise reuses the prominent ink over a subtle track.
Tests include both switch states, call fills as both buttons and phone icons,
Todo status icons, and tinted availability labels.
During a palette commit, an owned flag briefly suppresses CSS transitions until
the new fills and inks are painted together. It clears after two animation
frames, preserving normal hover/motion transitions between palette changes.
Merged-PR icons retain a fixed categorical purple, with separate contrast solves
for ordinary and own-message backgrounds; decorative hue rotation does not
turn them into a different GitHub state.

## Limits

- ANSI sixteen-color, indexed-color and explicit RGB terminal output keep the
  host/application colors; changing these needs a Buzz terminal theme interface.
- Native huddle windows receive Buzz’s mode, not the plugin’s CSS palette.
- Media editing colors, categorical charts, avatars, illustrations, OS chrome
  and embedded remote sites are not promised to follow the three color inputs.
- Plugins with their own fixed colors can bypass Buzz’s semantic roles.
- Numeric tests cover the declared role/context graph and sampled overlays.
  They do not establish comfort for every person or every possible host/plugin
  combination. APCA targets supplement the stated WCAG checks.

All plugin overrides are lifecycle-owned. Disabling restores Buzz’s own theme;
the plugin does not change Buzz source code or its saved appearance preference.
