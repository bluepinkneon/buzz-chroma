export function agentSettings(h,{state,enabled,onToggle,notice='',animations=[],selected='laughing',onSelect=()=>{},onPlay=()=>{},onRemove,playback=null,onStop=()=>{}}) {
  const names={off:'Off',starting:'Starting…',on:'On',stopping:'Stopping…',error:'Could not start',unavailable:'Not available in this Buzz build'};
  return h('details',{'aria-label':'Agent expression settings'},h('summary',null,'Agent expression'),
    h('p',null,'Let agents in Buzz use color for a mood, a celebration, or a gentle cue when they need your attention.'),
    h('div',{className:'chroma-agent-access'},
      h('label',{className:'chroma-agent-toggle'},
        h('input',{type:'checkbox','aria-label':'Let agents control colors',checked:enabled,disabled:!state.available&&!enabled,onChange:event=>onToggle(event.target.checked)}),
        h('span',null,h('strong',null,'Let agents control colors'),h('span',{className:'chroma-agent-detail'},'Makes the color tools available to agents in Buzz.'))),
      h('p',{role:'status'},names[state.status]??'Not available',state.error?` · ${state.error}`:'')),
    h('h3',null,'Animated presets'),
    h('label',null,'Animation',h('select',{'aria-label':'Animated preset',value:selected,onChange:event=>onSelect(event.target.value),style:{width:'100%',maxWidth:'100%'}},
      ...animations.map(p=>h('option',{key:p.id,value:p.id},`${p.name} · ${p.stepCount} steps`)))),
    h('button',{type:'button',onClick:onPlay},'Play animation'),
    ...(onRemove?[h('button',{type:'button',onClick:onRemove},'Remove saved animation')]:[]),
    h('p',{role:'status','aria-label':'Playback status'},playback?`${playback.name} · step ${playback.step} of ${playback.total} · ${playback.status}`:'No animation playing.'),
    ...(playback?[h('button',{type:'button',onClick:onStop},'Stop and return')]:[]),
    h('p',{className:'chroma-agent-warning'},'Buzz 0.7.9 restarts every Codex agent thread when tools are added or removed. Change this setting between tasks.'),
    ...(notice?[h('p',{role:'status'},notice)]:[]));
}
