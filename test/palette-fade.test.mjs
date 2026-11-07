import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaletteFade,fadeChoice,canFade,fadeDuration} from '../palette-fade.js';
const look=(h=359)=>({theme:'bluepinkneon',hues:[h,135,270],rotation:0,mode:'color',neutrals:[false,false,false],monoHue:null,neutral:false,surfaceOffset:90,neutralGround:false,appearance:'dark',localName:null});
function clock() {
  let time=0,id=0;const frames=new Map();
  return {now:()=>time,request:fn=>{frames.set(++id,fn);return id;},cancel:id=>frames.delete(id),
    draw(ms){time+=ms;const next=[...frames.values()];frames.clear();for(const fn of next)fn(time);},frames};
}
function fixture() {
  const c=clock(),writes=[],errors=[];let value=look(),top=true;
  const fade=createPaletteFade({...c,read:()=>value,isTop:()=>top,write:next=>{value=next;writes.push(next);},failed:e=>errors.push(e)});
  return {c,fade,writes,errors,get value(){return value;},top:v=>top=v};
}

test('hue fades take the short circular arc with cosine easing and exact endpoints',()=>{
  const a=look(359),b={...look(1),rotation:10};a.rotation=350;
  const middle=fadeChoice(a,b,.5);assert.equal(middle.hues[0],0);assert.equal(middle.rotation,0);
  assert.deepEqual(fadeChoice(a,b,0),a);assert.deepEqual(fadeChoice(a,b,1),b);
  middle.hues[1]=1;assert.equal(a.hues[1],135);assert.equal(b.hues[1],135);
  for(const changed of [{appearance:'light'},{mode:'mono'},{neutralGround:true},{neutrals:[true,false,false]},{theme:'default'}]) {
    const target={...b,...changed};assert.equal(canFade(a,target),false);assert.deepEqual(fadeChoice(a,target,.9),a);
  }
  for(const bad of [-1,1,999,300001,1.5,'5000',NaN,Infinity,null])assert.throws(()=>fadeDuration(bad),TypeError);
});

test('finite fades finish, interrupt from the displayed sample, and release their RAF',()=>{
  const f=fixture();f.fade.start(look(91),2000);f.c.draw(1000);assert.equal(f.value.hues[0],45);
  const current=structuredClone(f.value);f.fade.start(look(135),2000);assert.deepEqual(f.value,current);
  f.c.draw(1000);assert.equal(f.value.hues[0],90);f.c.draw(1000);assert.deepEqual(f.value,look(135));
  assert.equal(f.fade.state().status,'idle');assert.equal(f.c.frames.size,0);
});

test('mono fades compare inherited neutrality as well as stored neutral flags',()=>{
  const inherited={...look(0),mode:'mono',neutrals:[true,true,true]};
  const colored={...inherited,monoHue:29};
  assert.equal(canFade(inherited,colored),false);
  assert.equal(canFade(colored,inherited),false);
  assert.equal(canFade(colored,{...colored,monoHue:120}),true);
  assert.equal(canFade(inherited,{...inherited,rotation:90}),true);
  assert.equal(canFade({...inherited,mode:'color'},{...colored,mode:'color'}),true);
});
test('short arcs are measured on displayed hues even when seed and rotation changes cancel',()=>{
  const a=look(300),b={...look(100),rotation:200};
  for(let step=0;step<=20;step++) {
    const frame=fadeChoice(a,b,step/20);
    assert.equal((frame.hues[0]+frame.rotation)%360,300);
  }
});

test('covered handles pause elapsed time, while hiding the app completes the target',()=>{
  const f=fixture();f.fade.start(look(91),2000);f.c.draw(500);const first=structuredClone(f.value);
  f.top(false);f.c.draw(100);const covered=structuredClone(f.value);f.c.draw(10000);assert.deepEqual(f.value,covered);
  f.top(true);f.fade.reveal();f.c.draw(1400);assert.deepEqual(f.value,look(91));
  f.fade.start(look(180),2000);f.c.draw(500);f.fade.visibility(true);assert.deepEqual(f.value,look(180));assert.equal(f.c.frames.size,0);
});

test('reduced motion, topology changes, disposal and failures cannot leave a running fade',()=>{
  const f=fixture();f.fade.start(look(91),2000);f.c.draw(500);f.fade.reduce();assert.deepEqual(f.value,look(91));assert.equal(f.c.frames.size,0);
  const light={...look(200),appearance:'light'};f.fade.start(light,5000);assert.deepEqual(f.value,light);assert.equal(f.c.frames.size,0);
  f.fade.start({...light,hues:[250,135,270]},5000);f.fade.dispose();f.c.draw(10000);assert.deepEqual(f.value,light);assert.equal(f.c.frames.size,0);assert.throws(()=>f.fade.start(light,1000),/inactive/);
  const c=clock(),errors=[];let value=look();
  const broken=createPaletteFade({...c,read:()=>value,isTop:()=>true,write:()=>{throw new Error('fixture');},failed:e=>errors.push(e.message)});
  broken.start(look(100),1000);c.draw(500);assert.deepEqual(value,look());assert.deepEqual(errors,['fixture']);assert.equal(c.frames.size,0);
});

test('a failed interpolation releases the scheduler and preserves the painted frame',()=>{
  const f=fixture(),cos=Math.cos;f.fade.start(look(90),2000);
  Math.cos=()=>{throw Error('interpolation probe');};
  try{f.c.draw(500);}finally{Math.cos=cos;}
  assert.deepEqual(f.value,look());assert.equal(f.c.frames.size,0);assert.equal(f.fade.state().status,'idle');assert.equal(f.errors[0].message,'interpolation probe');
});
