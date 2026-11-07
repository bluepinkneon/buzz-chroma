export function agentSettings(h,{state,enabled,onToggle,notice=''}) {
  const names={off:'Off',starting:'Starting…',on:'On',stopping:'Stopping…',error:'Could not start',unavailable:'Not available in this Buzz build'};
  return h('details',{'aria-label':'Agent expression settings'},h('summary',null,'Agent expression'),
    h('p',null,'Let agents in Buzz use color for a mood, a celebration, or a gentle cue when they need your attention.'),
    h('div',{className:'chroma-agent-access'},
      h('label',{className:'chroma-agent-toggle'},
        h('input',{type:'checkbox','aria-label':'Let agents control colors',checked:enabled,disabled:!state.available&&!enabled,onChange:event=>onToggle(event.target.checked)}),
        h('span',null,h('strong',null,'Let agents control colors'),h('span',{className:'chroma-agent-detail'},'Makes the four color tools available to agents in Buzz.'))),
      h('p',{role:'status'},names[state.status]??'Not available',state.error?` · ${state.error}`:'')),
    h('p',{className:'chroma-agent-warning'},'Buzz 0.7.9 restarts every Codex agent thread when tools are added or removed. Change this setting between tasks.'),
    ...(notice?[h('p',{role:'status'},notice)]:[]));
}
