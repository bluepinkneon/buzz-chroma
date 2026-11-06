import test from 'node:test';
import assert from 'node:assert/strict';
import {host,find,click,select} from './host.mjs';
import {LIBRARY_KEY} from '../local-themes.js';
const textarea=app=>find(app.tree(),n=>n.props?.['aria-label']==='Preset backup JSON');
const paste=(app,text)=>textarea(app).props.onChange({target:{value:text}});

test('savePreset is create-only, complete, isolated, and survives restart through local: IDs',()=>{
  const h=host();let app=h.boot(),api=app.services.get('chroma');const before=h.css();
  assert.deepEqual(api.savePreset('christmas',{colors:['#d62828','#167a43','#efc66c'],appearance:'auto'}),{id:'local:christmas',persisted:true});
  assert.equal(h.css(),before,'saving does not apply or write user palette');
  const list=api.listPresets({includeSaved:true}),saved=list.find(p=>p.id==='local:christmas');assert.equal(saved.look.appearance,'auto');
  saved.look.hues[0]=123;assert.notEqual(api.listPresets({includeSaved:true}).at(-1).look.hues[0],123);
  assert(!api.listPresets().some(p=>p.id==='local:christmas'),'old list shape/default remains unchanged');
  const handle=api.setLook({preset:'local:christmas'}),expected=h.css();assert.equal(api.getLook().appearance,'auto');handle();
  assert.throws(()=>api.savePreset('christmas',{}),/already exists/);assert.throws(()=>api.savePreset('bad name',{}),/kebab/);
  assert.throws(()=>api.savePreset('blue-pink-neon',{}),/already exists/);
  assert.throws(()=>api.setLook({preset:'local:missing'}),/Unknown saved/);assert.equal(h.css(),before);
  app.dispose();app=h.boot();api=app.services.get('chroma');api.setLook({preset:'local:christmas'});assert.equal(h.css(),expected);
  app.dispose();
});

test('API preset writes fail closed on stale or unreadable library comparisons',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');h.saved.set(LIBRARY_KEY,'[]');
  assert.throws(()=>api.savePreset('no-clobber',{}),/another window/);assert.equal(h.saved.get(LIBRARY_KEY),'[]');
  globalThis.localStorage.getItem=()=>{throw Error('unreadable');};assert.throws(()=>api.savePreset('still-no',{}),/Could not check/);app.dispose();
  const bad=host(new Map([[LIBRARY_KEY,'not-json']])),locked=bad.boot();assert.throws(()=>locked.services.get('chroma').savePreset('no',{}),/locked/);assert.equal(bad.saved.get(LIBRARY_KEY),'not-json');locked.dispose();
});

test('quota failure is explicitly session-only and never masquerades as durable storage',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');localStorage.setItem=()=>{throw Error('quota');};
  assert.deepEqual(api.savePreset('session-look',{}),{id:'local:session-look',persisted:false});
  assert.equal(h.saved.get(LIBRARY_KEY),undefined);assert(api.listPresets({includeSaved:true}).some(p=>p.id==='local:session-look'));app.dispose();
});

test('JSON backup restores validated presets including appearance, and refuses duplicates atomically',async()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');api.savePreset('portable',{preset:'john-wick',appearance:'light'});
  await click(app,'Copy preset backup');const backup=textarea(app).props.value,doc=JSON.parse(backup);assert.equal(doc.presets[0].look.appearance,'light');app.dispose();
  const other=host(),restored=other.boot(),service=restored.services.get('chroma');paste(restored,backup);click(restored,'Import preset backup');
  assert.equal(service.listPresets({includeSaved:true}).at(-1).id,'local:portable');const bytes=other.saved.get(LIBRARY_KEY);
  click(restored,'Import preset backup');assert.equal(other.saved.get(LIBRARY_KEY),bytes);assert(JSON.stringify(restored.tree()).includes('Nothing was overwritten'));
  select(restored,'local:portable');assert.equal(service.getLook().appearance,'light');
  for(const invalid of ['{','{}',JSON.stringify({...doc,version:2}),JSON.stringify({...doc,presets:[{name:'bad name',look:doc.presets[0].look}]}),JSON.stringify({...doc,foreign:true})]) {
    paste(restored,invalid);click(restored,'Import preset backup');assert.equal(other.saved.get(LIBRARY_KEY),bytes);
  }
  restored.dispose();
});

test('a generation failure cannot create a preset or overwrite the current appearance',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),before=h.css(),stored=[...h.saved],look=api.getLook(),cos=Math.cos;
  Math.cos=()=>{throw Error('preset generation probe');};
  try{assert.throws(()=>api.savePreset('bad-generation',{...look,rotation:173}),/generation probe/);}finally{Math.cos=cos;}
  assert.deepEqual([...h.saved],stored);assert.equal(h.css(),before);app.dispose();
});
