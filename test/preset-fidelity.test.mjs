import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,getPreset} from '../presets.js';
import {host,click,select,input,find} from './host.mjs';
import {LIBRARY_KEY,paletteSnapshot} from '../local-themes.js';
import {hexOklch} from '../role-engine.js';
const retired=['storm','trinity','aragorn','katniss-everdeen','ripley','geralt-of-rivia','ahsoka-tano','obi-wan-kenobi','frodo-baggins','legolas','howl','san','motoko-kusanagi','totoro'];
const rootRoles=css=>{
  const block=css.match(/:root\[data-bluepinkneon\]\{color-scheme:[^}]+\}/)?.[0];assert(block);
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):(#[\da-f]{6})!important;/g)].filter(m=>!m[1].startsWith("--chroma-")).map(m=>[m[1],m[2]]));
};

test('all recommended recipes and every mode/appearance share seeds, with Auto equal to the resolved host mode',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');let states=0;
  for(const p of PRESETS){
    const recommended=api.setLook({preset:p.id});
    assert.equal(api.getLook().mode,p.defaultMode);assert.equal(api.getLook().appearance,p.defaultAppearance);
    assert.equal(api.getLook().neutralGround,p.neutralGround);recommended.dispose();
    for(const mode of ['color','duo','mono'])for(const appearance of ['dark','light','auto']){
      const live=api.setLook({preset:p.id,mode,appearance});
      for(const resolved of appearance==='auto'?['dark','light']:[appearance]){
        h.mode(resolved);const look=api.getLook(),roles=api.generateTheme({preset:p.id,mode,appearance:resolved});
        assert.deepEqual(look.hues,p.hues);assert.deepEqual(look.neutrals,p.neutrals);
        assert.equal(look.appearance,appearance);assert.equal(look.resolvedAppearance,resolved);
        assert.deepEqual(rootRoles(h.css()),roles,`${p.id}/${mode}/${appearance}/${resolved}`);
        assert.equal(Object.keys(roles).length,164);states++;
      }live.dispose();
    }
  }
  assert.equal(states,PRESETS.length*12);assert.equal(h.saved.size,0);app.dispose();
  console.log(JSON.stringify({characterRecipes:PRESETS.length,modeAppearanceStates:states}));
});

test('neutral-ground character schemes keep neutral reading surfaces and colored primary actions in both polarities',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  for(const p of PRESETS.filter(p=>p.neutralGround))for(const appearance of ['dark','light'])for(const mode of ['color','duo']){
    const roles=api.generateTheme({preset:p.id,mode,appearance});
    for(const k of ['--surface-base','--surface-panel','--surface-popover','--surface-inset','--affordance-row-hover','--affordance-subtle-pressed'])assert(hexOklch(roles[k]).c<.001,`${p.id} ${k}`);
    assert(hexOklch(roles['--affordance-prominent']).c>.03,`${p.id} signature accent must not become gray`);
    const live=api.setLook({preset:p.id,mode,appearance});
    const raw=h.css().match(/:root\[data-bluepinkneon\]\{[^}]+\}/)[0];
    for(const [,hex]of raw.matchAll(/--palette-shadow-\d+:(#[\da-f]{6});/g))assert(hexOklch(hex).c<.001);
    const before=h.css(),snapshot=api.getLook();live.update(snapshot);assert.equal(h.css(),before);
    const mono=api.generateTheme({preset:p.id,mode:'mono',appearance});
    assert.deepEqual(mono,api.generateTheme({preset:p.id,mode:'mono',appearance,neutralGround:false}),'one-hue reduction ignores neutral ground');
    live.dispose();
  }
  const ezio=api.setLook({preset:'ezio-auditore'});assert.equal(api.getLook().appearance,'light');
  const red=hexOklch(api.generateTheme({preset:'ezio-auditore'})['--affordance-prominent']);assert(red.h>=15&&red.h<=40);
  ezio.dispose();for(const id of ['batman','black-widow']){const l=api.setLook({preset:id});assert.equal(api.getLook().appearance,'dark');l.dispose();}app.dispose();
});

test('neutralGround validates atomically, survives local save/reload, and older states keep their previous ground',()=>{
  const h=host();let app=h.boot(),api=app.services.get('chroma');
  select(app,'ezio-auditore');const css=h.css(),before=api.getLook();
  for(const value of [null,0,1,'false',[],{}]){
    assert.throws(()=>api.setLook({neutralGround:value}),TypeError);
    assert.throws(()=>api.setLook({...before,neutralGround:value}),TypeError);assert.equal(h.css(),css);
  }
  input(app,'Theme name').props.onChange({target:{value:'white-and-red'}});click(app,'Save locally');
  assert.equal(JSON.parse(h.saved.get(LIBRARY_KEY))[0].look.neutralGround,true);
  app.dispose();app=h.boot();api=app.services.get('chroma');assert.equal(h.css(),css);
  select(app,'blue-pink-neon');assert.equal(api.getLook().neutralGround,false);
  select(app,'local:white-and-red');assert.equal(api.getLook().neutralGround,true);assert.equal(api.getLook().appearance,'dark');app.dispose();
  const old={...before,neutralGround:undefined},storage=new Map([['com.ranveer.bluepinkneon:theme:v3',JSON.stringify(old)]]);
  const legacy=host(storage).boot();assert.equal(legacy.services.get('chroma').getLook().neutralGround,false);legacy.dispose();
});

test('a smaller visible catalog does not erase saved colors or break legacy preset API callers',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');assert.equal(api.listPresets().length,28);
  for(const id of retired){
    assert(!api.listPresets().some(p=>p.id===id));
    assert(!find(app.tree(),n=>n.tag==='option'&&n.props.value===id));
    const recipe=getPreset(id),live=api.setLook({preset:id,appearance:'light'}),look=api.getLook();
    assert.deepEqual(look.hues,recipe.hues);assert.equal(look.preset,id);assert.equal(look.appearance,'light');
    live.update(look);live.dispose();
  }
  assert.throws(()=>api.setLook({preset:'unknown-character'}));app.dispose();
});

test('rendered character color families match the sourced identity brief rather than arbitrary palette spacing',async()=>{
  const {readFileSync}=await import('node:fs');
  const briefs=JSON.parse(readFileSync(new URL('./character-identities.json',import.meta.url),'utf8'));
  assert.deepEqual(new Set(briefs.map(b=>b.id)),new Set(PRESETS.map(p=>p.id)));
  const bands={red:[10,42],blue:[215,275],violet:[275,325],pink:[325,365],yellow:[75,115],green:[125,170],teal:[170,215],sepia:[45,85],rust:[35,65]};
  const verify=(hex,family,context)=>{
    const color=hexOklch(hex);
    if(family==='neutral'){assert(color.c<.001,`${context} must remain neutral, got ${hex}`);return;}
    const [lo,hi]=bands[family];assert(color.c>(context.endsWith("/ground")?.004:.012),`${context} lost its ${family} chroma`);
    const hue=family==='pink'&&color.h<5?color.h+360:color.h;
    assert(hue>=lo&&hue<=hi,`${context}: ${hex} h${color.h} must read ${family}`);
  };
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  for(const brief of briefs){
    assert(/^https:\/\//.test(brief.source));const p=PRESETS.find(p=>p.id===brief.id);
    assert.equal(p.defaultMode,brief.mode);assert.equal(p.defaultAppearance,brief.appearance);
    for(const appearance of ['dark','light']){
      const roles=api.generateTheme({preset:p.id,mode:'trichrome',appearance});
      for(const [index,key]of ['--affordance-prominent','--surface-message-own','--text-metadata'].entries())verify(roles[key],brief.colors[index],`${p.id}/${appearance}/${key}`);
      verify(roles['--surface-panel'],brief.ground,`${p.id}/${appearance}/ground`);
    }
  }app.dispose();
});
