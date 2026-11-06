import test from 'node:test';
import assert from 'node:assert/strict';
import {host,click,input,find,rotate} from './host.mjs';
import {LIBRARY_KEY} from '../local-themes.js';
const key='com.ranveer.bluepinkneon:theme:v3';
const setup=()=>{const h=host(),app=h.boot();h.flushFrames();return {h,app,api:app.services.get('chroma')};};
const snapshotCSS=h=>h.css();

test('setLook fades change the painted palette, finish exactly, and never save intermediate frames',()=>{
  const {h,app,api}=setup(),before=h.css(),stored=[...h.saved];
  const expected=api.generateTheme({rotation:90});
  const handle=api.setLook({rotation:90,fadeMs:2000});
  assert.equal(h.css(),before);assert.equal(handle.transition().status,'fading');
  assert(h.attributes.has('data-chroma-changing'));
  h.advance(1000);assert.equal(api.getLook().rotation,90,'getLook reports the target');const mid=h.css();assert.notEqual(mid,before);
  assert(h.attributes.has('data-chroma-changing'),'one held guard spans the complete fade');
  assert.deepEqual([...h.saved],stored);
  h.advance(1000);assert.equal(handle.transition().status,'idle');assert.equal(api.getLook().rotation,90);
  assert.deepEqual(api.generateTheme(api.getLook()),expected);const final=h.css();assert.notEqual(final,mid);
  const direct=api.setLook({rotation:90});assert.equal(h.css(),final);direct();assert.equal(h.css(),final);
  assert.deepEqual([...h.saved],stored);handle();assert.equal(h.css(),before);
  app.dispose();assert.equal(h.frames.size,0);assert.equal(h.styles.size,0);
});

test('update interrupts from the last painted key while keeping unedited target fields',()=>{
  const {h,app,api}=setup(),handle=api.setLook({rotation:120,fadeMs:4000});
  h.advance(1000);const from=h.css();assert.equal(api.getLook().rotation,120);
  handle.update({rotation:240,fadeMs:2000});assert.equal(h.css(),from,'interrupts from the painted frame');assert.equal(api.getLook().rotation,240);
  h.advance(1000);assert.notEqual(h.css(),from);
  const painted=h.css();assert.throws(()=>handle.update({fadeMs:500}),/at least/);assert.equal(h.css(),painted);
  assert.equal(handle.transition().status,'fading');h.advance(1000);assert.equal(api.getLook().rotation,240);
  app.dispose();
});

test('covered older handles pause and cannot override newer handles when updated',()=>{
  const {h,app,api}=setup(),a=api.setLook({rotation:120,fadeMs:4000});h.advance(1000);
  const b=api.setLook({rotation:300}),visible=h.css();
  a.update({rotation:90,fadeMs:2000});h.advance(5000);assert.equal(h.css(),visible);
  assert.equal(a.transition().status,'paused');b();h.advance(2000);assert.equal(api.getLook().rotation,90);
  app.dispose();
});

test('hidden windows and reduced motion commit the full target without an outstanding scheduler',()=>{
  for(const path of ['hidden','reduced','already-hidden','already-reduced']) {
    const {h,app,api}=setup();if(path==='already-hidden')h.visibility(true);if(path==='already-reduced')h.reduced(true);
    const handle=api.setLook({rotation:90,fadeMs:3000});
    if(path==='hidden')h.visibility(true);if(path==='reduced')h.reduced(true);
    assert.equal(api.getLook().rotation,90,path);assert.equal(handle.transition().status,'idle');h.flushFrames();assert.equal(h.frames.size,0);app.dispose();
  }
});

test('incompatible modes, neutral families and appearances switch as whole palettes',()=>{
  for(const options of [{appearance:'light'},{mode:'monochrome'},{neutralGround:true},{colors:['#808080','#ff0000','#00ff00']}]) {
    const {h,app,api}=setup(),target=api.generateTheme(options),handle=api.setLook({...options,fadeMs:5000});
    assert.equal(handle.transition().status,'idle');assert.deepEqual(api.generateTheme(api.getLook()),target);app.dispose();
  }
});

test('manual edits and local saves adopt the target, never a synthetic fade frame',()=>{
  for(const action of ['rotate','save','pick','appearance']) {
    const {h,app,api}=setup(),handle=api.setLook({rotation:120,fadeMs:4000});h.advance(1000);
    assert.equal(handle.transition().status,'fading');assert.equal(handle.transition().elapsedMs,1000);
    if(action==='rotate')rotate(app,200);
    if(action==='pick')input(app,'Primary').props.onChange({target:{value:'#ff7b00'}});
    if(action==='appearance')click(app,'Light');
    if(action==='save'){input(app,'Theme name').props.onChange({target:{value:'Keep My Target'}});click(app,'Save locally');assert.equal(JSON.parse(h.saved.get(LIBRARY_KEY))[0].look.rotation,120);}
    assert.equal(api.getLook().rotation,action==='rotate'?200:120,action);
    assert.equal(JSON.parse(h.saved.get(key)).rotation,action==='rotate'?200:120);
    assert.throws(()=>handle.update({rotation:1}),/inactive/);const css=h.css();h.advance(10000);assert.equal(h.css(),css);app.dispose();
  }
});

test('the settings omit fade configuration while the API retains opinionated transitions',()=>{
  const {h,app,api}=setup(),tree=JSON.stringify(app.tree());
  for(const removed of ['Color fades','Fade to preset','Fade time in seconds','Preview fade','Keep target look'])assert(!tree.includes(removed),removed);
  const handle=api.setLook({rotation:90,fadeMs:2000});assert.equal(handle.transition().status,'fading');h.advance(2000);assert.equal(api.getLook().rotation,90);assert.equal(h.saved.size,0);
  app.dispose();
});

test('disposing a covered handle does not touch the top fade or repaint its DOM attributes',()=>{
  const {h,app,api}=setup(),older=api.setLook({rotation:30}),top=api.setLook({rotation:150,fadeMs:4000});h.advance(1000);
  const before=api.getLook(),transition=top.transition();let writes=0;const root=document.documentElement,set=root.setAttribute;
  root.setAttribute=(...args)=>{writes++;set(...args);};older();assert.equal(writes,0);assert.deepEqual(api.getLook(),before);assert.deepEqual(top.transition(),transition);
  h.advance(3000);assert.equal(api.getLook().rotation,150);app.dispose();
});
