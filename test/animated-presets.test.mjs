import test from 'node:test';
import assert from 'node:assert/strict';
import {host,find,click,select} from './host.mjs';
import {LIBRARY_KEY,LEGACY_LIBRARY_KEY,paletteSnapshot} from '../local-themes.js';
const steps=()=>[{look:{rotation:60},fadeMs:1000,holdMs:1000},{look:{rotation:120},fadeMs:0,holdMs:1000}];
const backup=app=>find(app.tree(),n=>n.props?.['aria-label']==='Preset backup JSON');

test('v1 static libraries migrate in memory without activation writes and v2 adds complete animations',()=>{
  const seed=host().boot(),look=paletteSnapshot(seed.services.get('chroma').getLook());seed.dispose();
  const old=JSON.stringify([{name:'old-static',look}]),saved=new Map([[LEGACY_LIBRARY_KEY,old]]),h=host(saved);let app=h.boot(),api=app.services.get('chroma');
  assert.equal(saved.size,1);assert.equal(saved.get(LIBRARY_KEY),undefined);select(app,'local:old-static');
  const original=h.css();assert.deepEqual(api.savePreset('two-turns',{steps:steps()}),{id:'local:two-turns',persisted:true});assert.equal(h.css(),original);assert.equal(saved.get(LEGACY_LIBRARY_KEY),old);
  const record=JSON.parse(saved.get(LIBRARY_KEY)).find(p=>p.name==='two-turns');assert.equal(record.steps.length,2);assert.equal(record.steps[0].look.hues.length,3);assert.equal(record.steps[0].look.appearance,'dark');
  assert(!api.listPresets({includeSaved:true}).some(p=>p.id==='local:two-turns'));
  const entry=api.listPresets({includeSaved:true,includeAnimated:true}).find(p=>p.id==='local:two-turns');assert.equal(entry.kind,'animated');assert.equal(entry.stepCount,2);assert.equal(entry.durationMs,3000);assert.equal(entry.steps,undefined);
  assert.throws(()=>api.setLook({preset:'local:two-turns'}),/play/);app.dispose();app=h.boot();api=app.services.get('chroma');assert(api.listPresets({includeSaved:true,includeAnimated:true}).some(p=>p.id==='local:two-turns'));app.dispose();
});

test('named and inline animations share the same immutable validated timeline',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),input=steps();api.savePreset('same-program',{steps:input});
  const inline=api.play({steps:input}),frames=[];input[0].look.rotation=200;
  for(const ms of [1000,1000,1000]){h.advance(ms);frames.push(h.css());}assert.equal(inline.state().status,'completed');
  const named=api.play({preset:'local:same-program'});
  for(const [i,ms]of [1000,1000,1000].entries()){h.advance(ms);assert.equal(h.css(),frames[i]);}assert.equal(named.state().status,'completed');app.dispose();
});

test('animated saves preserve create-only, quota, stale-writer and legacy migration guards',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  api.savePreset('unique-animation',{steps:steps()});const before=h.saved.get(LIBRARY_KEY);assert.throws(()=>api.savePreset('unique-animation',{steps:steps()}),/already exists/);assert.throws(()=>api.savePreset('laughing',{steps:steps()}),/already exists/);assert.equal(h.saved.get(LIBRARY_KEY),before);
  localStorage.setItem=()=>{throw Error('quota');};assert.deepEqual(api.savePreset('session-animation',{steps:steps()}),{id:'local:session-animation',persisted:false});assert(api.listPresets({includeSaved:true,includeAnimated:true}).some(p=>p.id==='local:session-animation'));assert.equal(h.saved.get(LIBRARY_KEY),before);app.dispose();
  const legacy=host(new Map([[LEGACY_LIBRARY_KEY,'[]']])),old=legacy.boot();legacy.saved.set(LEGACY_LIBRARY_KEY,' [ ] ');assert.throws(()=>old.services.get('chroma').savePreset('no-clobber',{steps:steps()}),/another window/);assert.equal(legacy.saved.get(LIBRARY_KEY),undefined);old.dispose();
});

test('strict animated backups round-trip and old static backups remain readable',async()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');api.savePreset('portable-animation',{steps:steps()});await click(app,'Copy preset backup');const text=backup(app).props.value,doc=JSON.parse(text);assert.equal(doc.version,2);assert(doc.presets[0].steps);app.dispose();
  const other=host(),restored=other.boot(),service=restored.services.get('chroma');backup(restored).props.onChange({target:{value:text}});click(restored,'Import preset backup');assert(service.listPresets({includeSaved:true,includeAnimated:true}).some(p=>p.id==='local:portable-animation'));const bytes=other.saved.get(LIBRARY_KEY);
  click(restored,'Import preset backup');assert.equal(other.saved.get(LIBRARY_KEY),bytes);
  for(const bad of [{...doc,version:3},{...doc,presets:[{name:'invalid',steps:[{look:{},holdMs:0}]}]},{...doc,presets:[{name:'both',look:{},steps:steps()}]}]){backup(restored).props.onChange({target:{value:JSON.stringify(bad)}});click(restored,'Import preset backup');assert.equal(other.saved.get(LIBRARY_KEY),bytes);}
  const old={format:'buzz-chroma-presets',version:1,presets:[{name:'legacy-backup',look:paletteSnapshot(service.getLook())}]};backup(restored).props.onChange({target:{value:JSON.stringify(old)}});click(restored,'Import preset backup');assert(service.listPresets({includeSaved:true}).some(p=>p.id==='local:legacy-backup'));restored.dispose();
});

test('an invalid animation library locks writes without suppressing the base theme or inline playback',()=>{
  const bytes=JSON.stringify([{name:'bad-animation',steps:[{look:{},holdMs:1000}]}]),h=host(new Map([[LIBRARY_KEY,bytes]])),app=h.boot(),api=app.services.get('chroma');assert(h.css());assert.throws(()=>api.savePreset('not-written',{steps:steps()}),/locked/);api.play({steps:[{look:{rotation:90},holdMs:1000}]});h.advance(1000);assert.equal(h.saved.get(LIBRARY_KEY),bytes);app.dispose();
});

test('a capacity-sized animation library exports within the import bound and round-trips completely',async()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');let count=0;
  const program=Array.from({length:16},()=>({look:api.getLook(),fadeMs:0,holdMs:1000}));
  for(let i=0;i<50;i++){try{api.savePreset(`full-${i}`,{steps:program});count++;}catch(error){assert.match(error.message,/too large/);break;}}
  assert(count>20&&count<50);const bytes=h.saved.get(LIBRARY_KEY);assert(bytes.length>100000&&bytes.length<=131072);
  await click(app,'Copy preset backup');const exported=backup(app).props.value;assert(exported.length<=131200);app.dispose();
  const other=host(),restored=other.boot();backup(restored).props.onChange({target:{value:exported}});click(restored,'Import preset backup');
  assert.equal(other.saved.get(LIBRARY_KEY),bytes);assert.equal(restored.services.get('chroma').listPresets({includeSaved:true,includeAnimated:true}).filter(p=>p.id.startsWith('local:')).length,count);restored.dispose();
});

test('person-only removal of a selected saved animation frees quota without changing the static look',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  for(let i=0;i<50;i++)api.savePreset(`animation-${i}`,{steps:[{look:{rotation:90},holdMs:1000}]});
  assert.throws(()=>api.savePreset('over-quota',{steps:steps()}),/full/);
  const before=h.css(),look=api.getLook(),preferences=h.saved.get('com.ranveer.bluepinkneon:theme:v3');
  find(app.tree(),n=>n.props?.['aria-label']==='Animated preset').props.onChange({target:{value:'local:animation-0'}});click(app,'Remove saved animation');
  assert.equal(JSON.parse(h.saved.get(LIBRARY_KEY)).length,49);assert.equal(h.css(),before);assert.deepEqual(api.getLook(),look);assert.equal(h.saved.get('com.ranveer.bluepinkneon:theme:v3'),preferences);
  assert(!api.listPresets({includeSaved:true,includeAnimated:true}).some(p=>p.id==='local:animation-0'));
  assert.deepEqual(api.savePreset('new-animation',{steps:[{look:{rotation:180},holdMs:1000}]}),{id:'local:new-animation',persisted:true});app.dispose();
});
