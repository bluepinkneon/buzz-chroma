import test from 'node:test';
import assert from 'node:assert/strict';
import {agentPreferences,AGENT_PREFERENCES_KEY} from '../agent-preferences.js';
const LEGACY_KEY='com.ranveer.bluepinkneon:agents:v1';
function setup(saved=new Map(),available=true) {
  const calls=[];let disposed=false;
  const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const manager={getState:()=>({available}),set:async value=>{calls.push(value);},dispose:async()=>{disposed=true;}};
  const prefs=agentPreferences(manager,{storage});return {prefs,saved,calls,storage,manager,get disposed(){return disposed;}};
}
test('one supported agent setting defaults on without writing; unavailable builds stay off',async()=>{
  const f=setup();await f.prefs.start();assert.equal(f.prefs.get(),true);assert.deepEqual(f.calls,[true]);assert.equal(f.saved.size,0);
  const bare=setup(new Map(),false);await bare.prefs.start();assert.equal(bare.prefs.get(),false);assert.deepEqual(bare.calls,[]);assert.equal(bare.prefs.notice(),'');
});
test('explicit off persists, invalid input is atomic, and quota failures retain the session choice',async()=>{
  const f=setup();await f.prefs.set(false);assert.equal(f.saved.get(AGENT_PREFERENCES_KEY),'{"enabled":false}');
  const next=setup(f.saved);await next.prefs.start();assert.equal(next.prefs.get(),false);assert.deepEqual(next.calls,[]);
  for(const value of [1,'true',{},null])await assert.rejects(next.prefs.set(value),TypeError);assert.equal(next.prefs.get(),false);
  next.storage.setItem=()=>{throw Error('quota');};await next.prefs.set(true);assert.equal(next.prefs.get(),true);assert(next.prefs.notice().includes('this session'));
  await next.prefs.dispose();assert(next.disposed);await assert.rejects(next.prefs.set(false),/inactive/);
});
test('migration keeps the old Buzz preference, independently of outside access, without writing',async()=>{
  for(const native of [false,true])for(const external of [false,true]) {
    const saved=new Map([[LEGACY_KEY,JSON.stringify({native,external})]]),before=[...saved],f=setup(saved);await f.prefs.start();assert.equal(f.prefs.get(),native);assert.deepEqual(f.calls,native?[true]:[]);assert.deepEqual([...saved],before);
    await f.prefs.set(!native);const next=setup(saved);assert.equal(next.prefs.get(),!native,'new preference wins');
  }
});
test('corrupt current or legacy data and unreadable storage leave tools off with a visible notice',async()=>{
  for(const key of [AGENT_PREFERENCES_KEY,LEGACY_KEY])for(const raw of ['{','{}','[]','{"enabled":"true"}','{"enabled":true,"other":true}']) {
    const f=setup(new Map([[key,raw]]));await f.prefs.start();assert.equal(f.prefs.get(),false);assert.deepEqual(f.calls,[]);assert(f.prefs.notice());
  }
  const f=setup();f.storage.getItem=()=>{throw Error('blocked');};const p=agentPreferences(f.manager,{storage:f.storage});await p.start();assert.equal(p.get(),false);assert(p.notice());
});
test('rapid toggles retain the last choice even when completions arrive out of order',async()=>{
  const f=setup(),pending=[];f.manager.set=value=>new Promise(resolve=>pending.push(resolve));const first=f.prefs.set(true),second=f.prefs.set(false);pending[1]();await second;pending[0]();await first;assert.equal(f.prefs.get(),false);assert.equal(JSON.parse(f.saved.get(AGENT_PREFERENCES_KEY)).enabled,false);
});
