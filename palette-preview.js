// Previews read the exact emitted values; there is no second color algorithm.
const families=[['primary','Primary'],['secondary','Secondary'],['light','Neon'],['shadow','Ground'],['contrast','Red'],['accent','Green'],['warm','Amber'],['cool','Blue']];
const ansi=['black','red','green','yellow','blue','magenta','cyan','white'];
export function palettePreview(h,colors,roles,{fading=false}={}) {
  const value=hex=>fading?'live':hex;
  const swatch=(name,color,label=name)=>h('div',{key:name,'aria-label':label,className:'chroma-console-swatch',title:`${label} · ${value(color)}`},
    h('div',{'aria-hidden':true,className:'chroma-console-color',style:{background:`var(--ansi-${label.startsWith('Bright ')?'bright-':''}${name})`}}),h('span',null,name),h('code',null,value(color)));
  return h('section',{'aria-label':'Generated colors',className:'chroma-generated'},
    h('h2',null,'Your generated colors'),h('h3',null,'Palette'),
    ...families.map(([id,label])=>h('div',{key:id,className:'chroma-family-row'},h('span',null,label),
      h('div',{'aria-label':`${label} shades`,className:'chroma-family-shades'},
        ...Array.from({length:12},(_,step)=>h('div',{key:step,title:`${label} ${step} · ${value(colors[`--palette-${id}-${step}`])}`,'aria-label':`${label} ${step} ${value(colors[`--palette-${id}-${step}`])}`,style:{background:`var(--palette-${id}-${step})`}}))))),
    h('h3',null,'Console colors'),h('p',{className:'chroma-console-note',title:'Buzz 0.7.9 keeps its terminal ANSI defaults; background, text and selection follow this theme.'},'ANSI exports · Buzz keeps its own terminal ANSI colors.'),
    ...['','bright-'].map(prefix=>h('div',{key:prefix||'normal','aria-label':prefix?'Bright console colors':'Normal console colors',className:'chroma-console-row'},
      h('span',{className:'chroma-console-label'},prefix?'Bright':'Normal'),
      h('div',{className:'chroma-console-grid'},...ansi.map(name=>swatch(name,colors[`--ansi-${prefix}${name}`],prefix?`Bright ${name}`:name))))),
    h('h3',null,'Status and diffs'),h('div',{className:'chroma-status-grid'},
      ...[['Added · Success','success'],['Removed · Danger','danger'],['Warning','warning'],['Information','info']].map(([label,id])=>h('div',{key:id,className:'chroma-status-tile',style:{background:`var(--affordance-${id})`,color:`var(--text-${id})`}},
        h('strong',null,label),h('div',null,h('code',null,value(roles[`--text-${id}`])),h('span',{'aria-label':`${id} icon color`,title:value(roles[`--icon-${id}`]),className:'chroma-status-dot',style:{background:`var(--icon-${id})`}}))))),
    h('p',{className:'chroma-preview-note'},'Diff additions stay green. Removals stay red.'));
}
