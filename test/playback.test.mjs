import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSteps} from '../playback.js';
import {host,rotate,find,click} from './host.mjs';
import {createAgentTools} from '../agent-tools.js';
const steps=()=>[{look:{rotation:90},fadeMs:1000,holdMs:1000},{look:{rotation:180},fadeMs:1000,holdMs:1000}];

test('playback plan validation is bounded and freezes complete look data',()=>{
  const input=[{look:{hues:[1,2,3]},fadeMs:1000,holdMs:1000}],plan=normalizeSteps(input,x=>x);
  input[0].look.hues[0]=99;assert.equal(plan.steps[0].look.hues[0],1);assert(Object.isFrozen(plan.steps[0].look.hues));
  for(const invalid of [[],Array(2),Array(17).fill(input[0]),[{look:{},fadeMs:999,holdMs:1000}],[{look:{},holdMs:0}],[{look:{},holdMs:300001}],[{look:{},holdMs:1000,repeat:2}],[{look:{},fadeMs:300000,holdMs:1000}]])assert.throws(()=>normalizeSteps(invalid,x=>x));
});

test('compiled playback separates fades from full holds and returns its own lease without saving',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),before=h.css(),job=api.play({steps:steps()});
  assert.equal(job.state().status,'fading');h.advance(1000);assert.equal(job.state().status,'holding');
  h.advance(999);assert.equal(job.state().step,1);h.advance(1);assert.equal(job.state().status,'fading');assert.equal(job.state().step,2);
  h.advance(1000);assert.equal(job.state().status,'holding');h.advance(1000);
  assert.equal(job.state().status,'completed');assert.equal(job.state().step,job.state().total);assert.equal(api.getPlayback(),null);assert.equal(h.css(),before);assert.equal(h.timers.size,0);assert.equal(h.saved.size,0);app.dispose();
});

test('reduced motion and incompatible topology preserve full holds, while hidden UI cancels',()=>{
  for(const path of ['reduced','reduce-midway','topology']) {
    const h=host(),app=h.boot(),api=app.services.get('chroma'),before=h.css();
    if(path==='reduced')h.reduced(true);
    const job=api.play({steps:[{look:path==='topology'?{monochrome:'#808080'}:{rotation:90},fadeMs:2000,holdMs:1000}]});
    if(path==='reduce-midway'){h.advance(500);h.reduced(true);}
    assert.equal(job.state().status,'holding');h.advance(999);assert.equal(job.state().status,'holding');h.advance(1);
    assert.equal(job.state().status,'completed');assert.equal(job.state().step,1);assert.equal(h.css(),before);app.dispose();
  }
  const h=host(),app=h.boot(),api=app.services.get('chroma'),before=h.css(),job=api.play({steps:steps()});h.advance(500);h.visibility(true);
  assert.equal(job.state().status,'hidden');assert.equal(h.timers.size,0);assert.equal(h.css(),before);h.advance(100000);h.visibility(false);assert.equal(h.css(),before);
  h.visibility(true);assert.throws(()=>api.play({steps:steps()}),/Open Buzz/);app.dispose();
});

test('manual takeover, replacements and unload invalidate every future playback callback',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),a=api.play({steps:steps()});h.advance(500);rotate(app,210);const human=h.css();
  assert.equal(a.state().status,'user-edit');h.advance(100000);assert.equal(h.css(),human);assert.equal(h.timers.size,0);
  const b=api.play({steps:[{look:{rotation:20},holdMs:10000}]});
  assert.throws(()=>api.play({steps:[{look:{rotation:30},holdMs:1000},{look:{rotation:NaN},holdMs:1000}]}));assert.equal(api.getPlayback().id,b.state().id);
  const c=api.play({steps:[{look:{rotation:40},holdMs:10000}]});b.dispose();assert.equal(api.getPlayback().id,c.state().id);
  const staticLook=api.setLook({rotation:300});assert.equal(c.state().status,'replaced');h.advance(20000);assert.equal(api.getLook().rotation,300);staticLook.dispose();
  api.play({steps:[{look:{rotation:50},holdMs:10000}]});app.dispose();assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);assert.equal(h.styles.size,0);
});

test('playback pins the current appearance and expires rather than replaying a suspended program',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),before=h.css();
  const job=api.play({steps:[{look:{appearance:'light',rotation:90},holdMs:1000},{look:{appearance:'dark',rotation:180},holdMs:1000}]});
  assert.equal(api.getLook().resolvedAppearance,'dark');h.advance(1000);assert.equal(api.getLook().resolvedAppearance,'dark');h.advance(1000);assert.equal(h.css(),before);
  const late=api.play({steps:[{look:{rotation:90},holdMs:1000},{look:{rotation:180},holdMs:1000}]});h.advance(100000);assert.equal(late.state().status,'cancelled');assert.equal(h.css(),before);assert.equal(h.timers.size,0);app.dispose();
});

test('one play tool owns cancellation IDs across competing agents and keeps legacy setLook static',async()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),tools=createAgentTools(api),play=tools.find(t=>t.name==='chroma_play'),set=tools.find(t=>t.name==='chroma_set_look');
  const call=(args,who='a')=>play.call({pubkey:who},{},args).then(JSON.parse);
  const first=await call({steps:[{look:{rotation:90},holdMs:10000}]});
  await assert.rejects(call({cancel:first.playback.id},'b'),/not-owner/);assert.equal(api.getPlayback().id,first.playback.id);
  const second=await call({steps:[{look:{rotation:180},holdMs:10000}]},'b');assert.deepEqual(await call({cancel:first.playback.id}),{cancelled:false});assert.equal(api.getPlayback().id,second.playback.id);
  await call({cancel:second.playback.id},'b');assert.equal(api.getPlayback(),null);
  await call({preset:'laughing'});await set.call(undefined,undefined,{rotation:45});assert.equal(api.getPlayback(),null);h.advance(20000);assert.equal(api.getLook().rotation,45);
  await call({steps:[{look:{rotation:90},holdMs:10000}]});tools.dispose();assert.equal(api.getPlayback(),null);assert.equal(h.timers.size,0);await assert.rejects(call({preset:'laughing'}),/off/);app.dispose();
});

test('the existing Agent expression UI can discover, replace and stop an animation',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),before=h.css();
  assert(find(app.tree(),n=>n.props?.['aria-label']==='Animated preset'));
  click(app,'Play animation');const first=api.getPlayback().id;click(app,'Play animation');assert.notEqual(api.getPlayback().id,first);
  assert(JSON.stringify(find(app.tree(),n=>n.props?.['aria-label']==='Playback status')).includes('Laughing'));
  click(app,'Stop and return');assert.equal(h.css(),before);assert.equal(api.getPlayback(),null);app.dispose();
});

test('a temporary animation returns to an enduring agent atmosphere and get_look sees UI playback',async()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),tools=createAgentTools(api);
  const set=tools.find(t=>t.name==='chroma_set_look'),play=tools.find(t=>t.name==='chroma_play'),get=tools.find(t=>t.name==='chroma_get_look');
  await set.call(undefined,undefined,{appearance:'light',monochrome:'#d9a76d'});const atmosphere=h.css(),look=api.getLook();
  await play.call({pubkey:'a'},{},{preset:'laughing'});
  for(let i=0;i<3;i++){h.advance(1200);h.advance(1200);}
  assert.equal(api.getPlayback(),null);assert.equal(h.css(),atmosphere);assert.deepEqual(api.getLook(),look);
  click(app,'Play animation');const status=JSON.parse(await get.call(undefined,undefined,{}));assert.equal(status.playback.id,api.getPlayback().id);
  click(app,'Stop and return');assert.equal(h.css(),atmosphere);tools.dispose();app.dispose();
});
