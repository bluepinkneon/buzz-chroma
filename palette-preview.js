// Read the exact values already generated for the look; previewing never writes
// preferences or substitutes a second color algorithm.
const families=[['primary','Primary'],['secondary','Secondary'],['light','Neon'],['shadow','Ground'],['contrast','Red'],['accent','Green'],['warm','Amber'],['cool','Blue']];
const ansi=['black','red','green','yellow','blue','magenta','cyan','white'];
export function palettePreview(h,colors,roles) {
  const swatch=(name,color,label=name)=>h('div',{key:name,'aria-label':label,style:{minWidth:0}},
    h('div',{'aria-hidden':true,style:{height:'32px',borderRadius:'6px',background:color,border:'1px solid var(--border-standard)'}}),
    h('div',{style:{marginTop:'4px',fontSize:'12px'}},name),
    h('code',{style:{fontSize:'12px',color:'var(--text-metadata)'}},color));
  return h('section',{'aria-label':'Generated colors',style:{marginTop:'28px'}},
    h('h2',null,'Your generated colors'),
    h('h3',null,'Palette'),
    ...families.map(([id,label])=>h('div',{key:id,style:{marginBottom:'12px'}},
      h('div',{style:{marginBottom:'4px'}},label),
      h('div',{'aria-label':`${label} shades`,style:{display:'grid',gridTemplateColumns:'repeat(12,minmax(0,1fr))',gap:'3px'}},
        ...Array.from({length:12},(_,step)=>h('div',{key:step,title:`${label} ${step} · ${colors[`--palette-${id}-${step}`]}`,'aria-label':`${label} ${step} ${colors[`--palette-${id}-${step}`]}`,style:{height:'28px',borderRadius:'3px',background:colors[`--palette-${id}-${step}`],border:'1px solid var(--border-standard)'}}))))),
    h('h3',null,'Console colors'),
    h('p',null,'Normal and bright ANSI colors from the palette.'),
    ...['','bright-'].map(prefix=>h('div',{key:prefix||'normal','aria-label':prefix?'Bright console colors':'Normal console colors',style:{marginBottom:'12px'}},
      h('div',{style:{fontSize:'12px',color:'var(--text-metadata)',marginBottom:'6px'}},prefix?'Bright':'Normal'),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(64px,1fr))',gap:'8px'}},...ansi.map(name=>swatch(name,colors[`--ansi-${prefix}${name}`],prefix?`Bright ${name}`:name))))),
    h('h3',null,'Status and diffs'),
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'12px'}},
      ...[['Added · Success','success'],['Removed · Danger','danger'],['Warning','warning'],['Information','info']].map(([label,id])=>h('div',{key:id,style:{background:roles[`--affordance-${id}`],color:roles[`--text-${id}`],borderRadius:'8px',padding:'12px'}},
        h('strong',null,label),h('div',null,roles[`--text-${id}`]),h('span',{'aria-label':`${id} icon color`,title:roles[`--icon-${id}`],style:{display:'inline-block',width:'16px',height:'16px',marginTop:'8px',borderRadius:'50%',background:roles[`--icon-${id}`]}})))),
    h('p',{style:{fontSize:'12px',color:'var(--text-metadata)'}},'Alerts keep familiar meanings. Diff additions stay green and removals stay red.'));
}
