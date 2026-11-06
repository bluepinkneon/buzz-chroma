// Buzz's public semantic roles. Component states share recipes only where their
// foreground context is the same; the contrast graph tests the rendered values.
export function mapRoles({surfaces:s, inks:i, borders:b, signals:g}) {
  const out = {};
  const put = (value, names) => names.split(" ").forEach(name => { out[`--${name}`] = value; });
  put(s.base, "bg-app surface-base bg-glass-primary");
  put(s.panel, "surface-panel surface-composer bg-panel surface-message");
  put(s.popover, "surface-popover surface-elevated-glass bg-float bg-glass-secondary affordance-navigation-quiet");
  put(s.inset, "surface-inset");
  put(s.hover, "bg-glass-primary-hover bg-glass-secondary-hover affordance-subtle affordance-backdrop-hover affordance-row-hover affordance-chrome affordance-panel-hover affordance-floating-control affordance-reaction surface-message-hover");
  put(s.pressed, "affordance-subtle-pressed affordance-backdrop-pressed affordance-floating-control-pressed");
  put(s.selected, "affordance-subtle-hover affordance-chrome-hover affordance-floating-hover affordance-floating-control-hover");
  put(s.selected, "bg-chrome-selected affordance-selected surface-navigation-selected affordance-navigation-selected surface-row-selected-detail surface-control-selected affordance-popover-selected affordance-floating-selected affordance-sidebar-hover affordance-accent affordance-mention");
  put(s.highlight, "affordance-accent-hover affordance-mention-hover");
  put(s.highlight, "affordance-message-highlight surface-message-highlight");
  put(s.own, "surface-message-own");
  put(s.ownHover, "surface-message-own-hover affordance-message-own-hover affordance-reaction-own affordance-mention-own");
  put(s.ownHighlight, "affordance-mention-own-hover");
  put(s.ownHighlight, "affordance-message-own-highlight");
  put(s.prominent, "affordance-prominent affordance-accent-prominent surface-text-selection surface-text-selection-own affordance-mention-self");
  put(s.selected, "surface-sidebar-selected affordance-reaction-self");
  put(s.ownHover, "affordance-reaction-self-own");
  put(s.prominentHover, "affordance-prominent-hover affordance-accent-prominent-hover affordance-mention-self-hover");
  put(s.prominentPressed, "affordance-prominent-pressed affordance-accent-prominent-pressed");
  put(s.hover, "affordance-disabled");
  put(i.standard, "text-standard text-navigation text-navigation-unread text-primary text-row");
  put(i.subtle, "text-subtle text-secondary text-row-subtle text-chrome-subtle");
  put(i.metadata, "text-metadata text-tertiary text-quiet-control text-row-metadata");
  put(i.disabled, "text-unavailable text-disabled");
  put(i.link, "text-link text-accent text-message-link");
  put(s.hover, "affordance-link-hover");
  put(i.link, "affordance-prominent-mark");
  put(i.onSelected, "text-navigation-selected text-row-selected text-row-selected-detail text-control-selected text-sidebar-hover text-sidebar-selected text-mention");
  put(i.selectedSubtle, "text-row-selected-subtle");
  put(i.selectedMetadata, "text-row-selected-metadata");
  put(i.onOwn, "text-message-own text-mention-own");
  put(i.linkOwn, "text-message-link-own");
  put(i.ownMetadata, "text-metadata-own icon-subtle-own");
  put(i.onProminent, "text-on-prominent text-on-accent text-on-selection text-on-selection-own text-mention-self");
  put(b.standard, "border-standard border-primary border-message-thread");
  put(b.prominent, "border-prominent border-control border-floating-control scrollbar-thumb border-reaction-self border-reaction-self-own");
  put(b.focus, "border-focus border-accent");
  put(b.standard, "scrollbar-thumb-quiet");
  put(b.prominent, "status-offline");
  put(i.standard, "surface-inverse");
  put(s.base, "text-inverse");
  for (const [name, signal] of Object.entries(g)) {
    put(signal.ink, `text-${name} icon-${name}`);
    put(signal.border, `border-${name}`);
    put(signal.fill, `affordance-${name}`);
    put(signal.hover, `affordance-${name}-hover`);
    put(signal.pressed, `affordance-${name}-pressed`);
  }
  put(g.success.ink, "status-online icon-success-own");
  put(g.warning.ink, "status-away");
  put(g.success.border, "border-success-subtle");
  put(i.linkOwn, "icon-categorical-purple-own");
  return out;
}

export function roleCss(roles, appearance, mode) {
  const selector = ':root[data-bluepinkneon],:root[data-bluepinkneon] :is(.dark,.light,[data-color-mode],[data-accent],[data-color-level])';
  return `${selector}{color-scheme:${appearance};${Object.entries(roles).map(([k,v])=>`${k}:${v}!important;`).join("")}}\n` +
    // Neutral and one-hue selected states retain a non-color cue. No geometry or
    // font-weight change; it is painted inside the existing control.
    (mode === "mono" ? ':root[data-bluepinkneon] :is(.navigation-item[data-selected],.buzz-tabs-tab[data-selected],.buzz-button[data-icon-variant="ghost"][data-selected],[aria-current="page"]){box-shadow:inset 3px 0 var(--border-focus)!important;}\n:root[data-bluepinkneon] [data-mention-kind][data-mention-self]{box-shadow:inset 0 0 0 1px currentColor!important;}' : "");
}
