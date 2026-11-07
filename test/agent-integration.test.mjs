import test from 'node:test';
import assert from 'node:assert/strict';
import {host,find,select} from './host.mjs';
import {createAgentTools,polarityGate} from '../agent-tools.js';
import {LIBRARY_KEY} from '../local-themes.js';
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const parse=async(tool,args={})=>JSON.parse(await tool.call(undefined,undefined,args));
const fixture=()=>{const h=host(),app=h.boot(),api=app.services.get('chroma'),tools=createAgentTools(api);return {h,app,api,tools};};
function nativeContext({pending=false}={}) {
  const registered=new Map(),children=[],waiting=[];
  const capability={addTool(){}};
  return {registered,children,release:()=>waiting.forEach(fn=>fn()),extra:{reflect:{get:name=>name==='agents'?capability:undefined},plugin({apply}){
    const owned=[];let closed=false;
    const fiber={async dispose(){if(closed)return;closed=true;for(const name of owned)registered.delete(name);}};
    children.push(fiber);const start=()=>{if(!closed)apply({agents:{addTool(tool){if(registered.has(tool.name))throw Error('duplicate');registered.set(tool.name,tool);owned.push(tool.name);}}});};if(pending)waiting.push(start);else start();return fiber;
  }}};
}

test('all tool aliases, arbitrary finite rotation and long fades reach the real compiled API',async()=>{
  const {h,app,api,tools}=fixture();
  for(const [mode,id] of [['color','color'],['trichrome','color'],['duo','duo'],['bichrome','duo'],['dichrome','duo'],['mono','mono'],['monochrome','mono']]) {
    const out=await parse(tools[1],{mode,rotation:721,fadeMs:300000});assert.equal(out.transition.target?.mode??out.look.mode,id);
    h.advance(300000);assert.equal(api.getLook().mode,id);assert.equal(api.getLook().rotation,1);
  }
  tools.dispose();app.dispose();
});

test('real tools create and recall a complete local recipe, and restore an unstripped snapshot',async()=>{
  const {h,app,api,tools}=fixture(),[get,set,save,list]=tools;
  const recipe={colors:['#d62828','#167a43','#efc66c'],appearance:'dark',mode:'trichrome',rotation:30};
  const original=await parse(get),before=h.css();
  assert.deepEqual(await parse(save,{name:'christmas',look:recipe}),{id:'local:christmas',persisted:true});
  assert.equal(h.css(),before);assert((await parse(list)).presets.some(p=>p.id==='local:christmas'));
  await parse(set,{preset:'local:christmas',fadeMs:2000});h.advance(2000);
  const christmas=await parse(get);assert.deepEqual(christmas.palette,api.generateTheme(christmas.look));
  const copy=await parse(set,{look:christmas.look});assert.deepEqual(copy.look,christmas.look);
  await parse(set,{look:original.look,fadeMs:2000});h.advance(2000);assert.deepEqual((await parse(get)).look,original.look);
  assert.equal(h.saved.has('com.ranveer.bluepinkneon:theme:v3'),false,'tool overrides never save the user look');
  const bytes=h.saved.get(LIBRARY_KEY);await assert.rejects(parse(save,{name:'Christmas Cheer',look:recipe}),/invalid-arguments/);await assert.rejects(parse(save,{name:'missing-look'}),/invalid-arguments/);assert.equal(h.saved.get(LIBRARY_KEY),bytes);
  tools.dispose();app.dispose();
});

test('a tool replacement preserves the new fade, and an empty setter returns to the saved user look',async()=>{
  const {h,app,api,tools}=fixture(),original=api.getLook();
  await parse(tools[1],{rotation:120});const out=await parse(tools[1],{rotation:240,fadeMs:2000});
  assert.equal(out.transition.status,'fading');assert.equal(out.transition.target.rotation,240);h.advance(1000);assert.equal(api.getLook().rotation,240,'getLook reports the requested target, never a fade frame');
  await parse(tools[1],{});assert.deepEqual(api.getLook(),original);h.advance(3000);assert.deepEqual(api.getLook(),original);tools.dispose();app.dispose();
});

test('Buzz default uses actual host appearance, and restore cannot bypass the shared polarity gate',async()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');h.mode('light');select(app,'default');
  const tools=createAgentTools(api,{gate:polarityGate(()=>0)}),before=await parse(tools[0]);assert.equal(before.look.resolvedAppearance,'light');assert.equal(before.palette,undefined);
  await parse(tools[1],{preset:'neo'});assert.equal(api.getLook().resolvedAppearance,'dark');
  await assert.rejects(parse(tools[1],{look:before.look}),/appearance-rate-limited/);assert.equal(api.getLook().theme,'bluepinkneon');tools.dispose();app.dispose();
});

test('the compiled plugin registers four Buzz tools by default through a single setting, then removes them',async()=>{
  const native=nativeContext(),h=host(new Map(),native.extra),app=h.boot();
  const checkbox=()=>find(app.tree(),n=>n.props?.['aria-label']==='Let agents control colors');
  assert.equal(checkbox().props.checked,true);await settle();assert.equal(native.registered.size,4);assert.equal(h.saved.size,0);assert.equal(native.children.length,1);assert.equal(find(app.tree(),n=>n.props?.['aria-label']==='Let local agents control colors'),undefined);
  assert(JSON.stringify(app.tree()).includes('every Codex agent thread'));
  const get=native.registered.get('chroma_get_look'),set=native.registered.get('chroma_set_look');
  const before=await parse(get);await parse(set,{colors:['#d62828','#167a43','#efc66c'],mode:'trichrome',fadeMs:2000});h.advance(2000);assert.notDeepEqual((await parse(get)).look,before.look);
  checkbox().props.onChange({target:{checked:false}});await settle();assert.equal(native.registered.size,0);assert.deepEqual(app.services.get('chroma').getLook(),before.look);
  await assert.rejects(parse(get),/off/);app.dispose();await settle();assert.equal(h.styles.size,0);const second=nativeContext(),next=host(h.saved,second.extra).boot();await settle();assert.equal(second.registered.size,0);next.dispose();await settle();
});

test('mid-fade snapshots are the requested target, so save and cue-restore never adopt a synthetic frame',async()=>{
  const {h,app,api,tools}=fixture(),[get,set,save]=tools,user=(await parse(get)).look;
  const out=await parse(set,{rotation:120,fadeMs:4000});assert.equal(out.look.rotation,120);assert.equal(out.transition.status,'fading');
  h.advance(2000);const painted=h.css(),mid=(await parse(get)).look;assert.equal(mid.rotation,120);
  await parse(save,{name:'calm-turn',look:mid});assert.equal(api.listPresets({includeSaved:true}).find(p=>p.id==='local:calm-turn').look.rotation,120);
  h.advance(4000);assert.notEqual(h.css(),painted);
  await parse(set,{look:user,fadeMs:2000});h.advance(1000);const snap=(await parse(get)).look;
  await parse(set,{rotation:200});await parse(set,{look:snap});h.advance(5000);
  assert.deepEqual((await parse(get)).look,user);tools.dispose();app.dispose();
});

test('an empty setter returns a Buzz-default user to Buzz default and counts as a possible polarity cut',async()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');h.mode('light');select(app,'default');
  let now=0;const tools=createAgentTools(api,{gate:polarityGate(()=>now)}),user=api.getLook();
  await parse(tools[1],{preset:'neo'});assert.equal(api.getLook().theme,'bluepinkneon');
  await assert.rejects(parse(tools[1],{}),/appearance-rate-limited/);assert.equal(api.getLook().theme,'bluepinkneon');
  now=1000;await parse(tools[1],{});assert.deepEqual(api.getLook(),user);
  now=2000;await parse(tools[1],{preset:'neo'});await assert.rejects(parse(tools[1],{look:user}),/appearance-rate-limited/);assert.equal(api.getLook().theme,'bluepinkneon');
  now=3000;await parse(tools[1],{look:user});assert.deepEqual(api.getLook(),user);tools.dispose();app.dispose();
});

test('legacy Buzz access is preserved and outside-only preference never enables tools',async()=>{
  for(const native of [true,false]) {
    const context=nativeContext(),saved=new Map([['com.ranveer.bluepinkneon:agents:v1',JSON.stringify({native,external:true})]]),app=host(saved,context.extra).boot();await settle();assert.equal(context.registered.size,native?4:0);assert.equal(saved.size,1);app.dispose();await settle();assert.equal(context.registered.size,0);
  }
});

test('unloading during default registration never revives tools',async()=>{
  const context=nativeContext({pending:true}),app=host(new Map(),context.extra).boot();await settle();assert.equal(context.children.length,1);app.dispose();context.release();await settle();assert.equal(context.registered.size,0);
});
