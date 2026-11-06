import test from 'node:test';
import assert from 'node:assert/strict';
import {agentPreferences,AGENT_PREFERENCES_KEY} from '../agent-preferences.js';
function setup(raw=null) {
  const saved=new Map(raw===null?[]:[[AGENT_PREFERENCES_KEY,raw]]),calls=[];let disposed=false;
  const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const manager={getState:()=>({capabilities:{native:true,external:true}}),set:async value=>{calls.push(value);},dispose:async()=>{disposed=true;}};
  const prefs=agentPreferences(manager,{storage});return {prefs,saved,calls,storage,manager,get disposed(){return disposed;}};
}
test('corrupt and unreadable settings never enable an agent connection',async()=>{
  for(const raw of ['{','{}','[]','{"native":"true","external":false}','{"native":true,"external":false,"other":true}']) {
    const f=setup(raw);await f.prefs.start();assert.deepEqual(f.prefs.get(),{native:false,external:false});assert.equal(f.calls.length,0);assert(f.prefs.notice());
  }
  const f=setup();f.storage.getItem=()=>{throw Error('blocked');};const p=agentPreferences(f.manager,{storage:f.storage});await p.start();assert.equal(f.calls.length,0);assert(p.notice());
});
test('supported local access defaults on without saving, while explicit off and unavailable hosts stay off',async()=>{
  const f=setup();await f.prefs.start();assert.deepEqual(f.calls,[{native:false,external:true}]);assert.equal(f.saved.size,0);assert.equal(f.prefs.notice(),'');
  await f.prefs.set({external:false});const next=setup(f.saved.get(AGENT_PREFERENCES_KEY));await next.prefs.start();assert.deepEqual(next.prefs.get(),{native:false,external:false});assert.equal(next.calls.length,0);
  const unavailable=setup();unavailable.manager.getState=()=>({capabilities:{native:true,external:false}});
  const prefs=agentPreferences(unavailable.manager,{storage:unavailable.storage});await prefs.start();assert.equal(prefs.get().external,false);assert.equal(unavailable.calls.length,0);assert.equal(prefs.notice(),'');
});
test('only explicit booleans persist, and enabled settings restart without credentials',async()=>{
  const f=setup();await f.prefs.set({external:true});assert.deepEqual(f.calls,[{native:false,external:true}]);
  const raw=f.saved.get(AGENT_PREFERENCES_KEY);assert.equal(raw,'{"native":false,"external":true}');
  const next=setup(raw);await next.prefs.start();assert.deepEqual(next.calls,[{native:false,external:true}]);
  await next.prefs.dispose();assert(next.disposed);await assert.rejects(next.prefs.set({external:false}),/inactive/);
});
test('quota failure preserves session choice and reports the durability limit',async()=>{
  const f=setup();f.storage.setItem=()=>{throw Error('quota');};await f.prefs.set({native:true});
  assert.equal(f.prefs.get().native,true);assert(f.prefs.notice().includes('this session'));assert.equal(f.saved.size,0);
  await assert.rejects(f.prefs.set({native:1}),TypeError);assert.equal(f.prefs.get().native,true);
});
test('rapid toggles retain the latest preference even if an older transport result arrives last',async()=>{
  const f=setup(),pending=[];f.manager.set=value=>{f.calls.push(value);return new Promise(resolve=>pending.push(resolve));};
  const first=f.prefs.set({external:true}),second=f.prefs.set({external:false});
  pending[1]();await second;pending[0]();await first;
  assert.deepEqual(f.prefs.get(),{native:false,external:false});assert.equal(JSON.parse(f.saved.get(AGENT_PREFERENCES_KEY)).external,false);
});
