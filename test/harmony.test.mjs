import test from "node:test";
import assert from "node:assert/strict";
import {deriveNeonHue,derivedNeonNeutral} from "../harmony.js";
import {host,input,click,find,rotate} from "./host.mjs";
const wrap=n=>((n%360)+360)%360;
const distance=(a,b)=>Math.abs(((a-b+540)%360)-180);

test("two-color Neon is periodic, rotation-equivariant and mirror-symmetric across every hue pair",()=>{
  assert.equal(deriveNeonHue(224,359),179);assert.equal(deriveNeonHue(25,280),86);
  for(let p=0;p<360;p++)for(let s=0;s<360;s++) {
    const n=deriveNeonHue(p,s),r=(p*37+s*17)%360;
    assert.equal(deriveNeonHue(p+r,s+r),wrap(n+r));
    assert(distance(deriveNeonHue(p,2*p-s),wrap(2*p-n))<=1);
    assert(distance(n,deriveNeonHue(p,(s+1)%360))<=2);
    assert(distance(n,deriveNeonHue((p+1)%360,s))<=3);
  }
  assert.equal(deriveNeonHue(25,205),25,"complementary pairs deliberately share the primary hue");
  assert.equal(deriveNeonHue(0,123,[true,false]),123);
  assert.equal(deriveNeonHue(234,0,[false,true]),234);
  assert.equal(deriveNeonHue(2,3,[true,true]),0);assert(derivedNeonNeutral([true,true]));
});

test("UI asks for Primary only, Primary/Secondary, or Primary/Secondary/Neon with one shared Hue rotation",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma"),original=h.css();
  assert(input(app,"Primary")&&input(app,"Secondary")&&input(app,"Neon"));
  click(app,"Bichrome");assert(input(app,"Primary")&&input(app,"Secondary"));assert(!input(app,"Neon"));
  assert.equal(api.getLook().effectiveHues[2],179);assert.equal(h.css(),original,"original harmony matches the original triple");
  click(app,"Monochrome");assert(input(app,"Primary"));assert(!input(app,"Secondary")&&!input(app,"Neon"));
  assert(find(app.tree(),n=>n.props?.id==="bluepinkneon-rotation"));
  rotate(app,45);assert.equal(api.getLook().rotation,45);app.dispose();
});

test("live setter accepts one, two or three input colors, deriving Neon without losing hidden seeds",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  const look=api.setLook({mode:"bichrome",colors:["#0099dd","#dd4083"]});
  assert.equal(api.getLook().mode,"duo");const third=api.getLook().hues[2];
  assert.equal(api.getLook().effectiveHues[2],deriveNeonHue(...api.getLook().effectiveHues.slice(0,2)));
  look.update({colors:["#cc2233","#3355ff"]});assert.equal(api.getLook().hues[2],third);
  look.update({mode:"monochrome",colors:["#cc2233"]});assert.equal(api.getLook().mode,"mono");
  assert.equal(new Set(api.getLook().effectiveHues).size,1);
  look.update({mode:"trichrome",colors:["#0099dd","#dd4083","#95fae4"]});assert.equal(api.getLook().mode,"color");
  const before=h.css();assert.throws(()=>look.update({mode:"bichrome",colors:Array(2)}));assert.equal(h.css(),before);
  look.dispose();app.dispose();
});
