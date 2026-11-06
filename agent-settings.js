// Sharing is opt-in. The host owns registration, credentials and transport;
// this view never sees an MCP server object or a connection secret.
export function agentSettings(h,{state,enabled,onToggle,notice=''}) {
  const names={off:'Off',starting:'Starting…',on:'On',stopping:'Stopping…',error:'Could not start',unavailable:'Not available in this Buzz build'};
  const toggle=(key,label,detail)=>h('div',{className:'chroma-agent-access',key},
    h('label',{className:'chroma-agent-toggle'},
      h('input',{type:'checkbox','aria-label':label,checked:enabled[key],disabled:!state.capabilities[key]&&!enabled[key],onChange:event=>onToggle(key,event.target.checked)}),
      h('span',null,h('strong',null,label),h('span',{className:'chroma-agent-detail'},detail))),
    h('p',{role:'status'},names[state[key].status]??'Not available',state[key].error?` · ${state[key].error}`:''));
  return h('details',{'aria-label':'Agent expression settings'},h('summary',null,'Agent expression'),
    h('p',null,'Let agents use color as a subtle expression: a calm working mood, a celebration, or a gentle cue when they need your attention.'),
    toggle('external','Let local agents control colors','Shares four color tools with agents and other processes running as you on this computer.'),
    toggle('native','Let Buzz agents control colors','Adds the same four tools to Buzz’s agent tool registry.'),
    h('p',{className:'chroma-agent-warning'},'Buzz 0.7.9 restarts every Codex agent thread when tools are added or removed. Enable or disable Buzz agent tools between tasks.'),
    h('p',null,'Tools can read the look and generated palette, change colors, list presets, and create local presets. They cannot overwrite or remove saved presets.'),
    h('p',null,'Sequences and waits stay with the agent. Each color call chooses one look and an optional finite fade. Your controls take over from a temporary look.'),
    ...(state.external.status==='on'?[h('p',null,'Local tools are available through Buzz’s bundled buzz-agent-command helper. See the README for discovery commands.')]:[]),
    ...(notice?[h('p',{role:'status'},notice)]:[]));
}
