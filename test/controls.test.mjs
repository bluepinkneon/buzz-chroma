import test from "node:test";
import assert from "node:assert/strict";
import {host,input,click,rotate,variables,find} from "./host.mjs";

test("picker round-trips every rendered swatch without drifting across all 360 hues", () => {
  const h=host(), app=h.boot();
  for(let hue=0;hue<360;hue++) {
    rotate(app,hue);
    for(const name of ["Primary","Secondary","Neon"]) {
      const shown=input(app,name), before=h.css();
      shown.props.onChange({target:{value:shown.props.value}});
      assert.equal(h.css(),before,`${hue} ${name}`);
    }
  }
  app.dispose();
});

test("neutral pickers affect their own family; explicit monochrome retains distinct states",()=>{
  const h=host(),app=h.boot();
  input(app,"Neon").props.onChange({target:{value:"#808080"}});
  let state=JSON.parse([...h.saved.values()][0]);
  assert.equal(state.mode,"color");assert.deepEqual(state.neutrals,[false,false,true]);
  assert.equal(variables(h.css()).get("--palette-primary-7"),"#0099dd");
  click(app,"Monochrome");click(app,"Neutral gray");
  assert(h.css().includes('[data-selected]'));
  click(app,"Light"); assert(h.css().includes("color-scheme:light"));
  click(app,"Dark"); assert(h.css().includes("color-scheme:dark"));
  app.dispose();
});

test("Auto follows Buzz's explicit resolved mode, reacts live, and cleans observers",()=>{
  const h=host(),app=h.boot();h.mode("light");
  assert(h.css().includes("color-scheme:dark"),"manual dark wins");
  click(app,"Auto");assert(h.css().includes("color-scheme:light"));
  h.mode("dark");assert(h.css().includes("color-scheme:dark"));
  click(app,"Monochrome");h.mode("light");assert(h.css().includes("color-scheme:light"));
  app.dispose();assert.equal(h.observers.size,0);assert.equal(h.mediaListeners.size,0);
});

test("legacy hue preferences migrate without overwriting the rollback key",()=>{
  const key="com.ranveer.bluepinkneon:theme:v2";
  for(const hues of [[224,359,134],[0,90,359],[359,1,45]]) {
    const original=JSON.stringify({theme:"bluepinkneon",hues,rotation:129});
    const h=host(new Map([[key,original]])),app=h.boot();
    const look=app.services.get("chroma").getLook();
    assert.equal(look.hues[2],(hues[2]+45)%360);assert.equal(look.rotation,129);
    assert.equal(h.saved.get(key),original);app.dispose();
  }
});

test("callable service validates atomically, stacks temporary leases, and unregisters",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma"),original=h.css();
  assert.equal(api.version,1);
  const a=api.setLook({colors:["#ff0000","#00ff00","#0000ff"],appearance:"light"});
  const first=h.css();assert.notEqual(first,original);assert.equal(h.saved.size,0);
  const again=api.setLook({});assert.equal(h.css(),first);again();assert.equal(h.css(),first);
  const b=api.setLook({mode:"monochrome",monochrome:"#808080",rotation:45});
  const second=h.css();assert.notEqual(second,first);
  a();assert.equal(h.css(),second,"disposing old caller cannot undo latest caller");
  for(const bad of [{rotation:Infinity},{colors:["red"]},{colors:Array(3)},{mode:"mono"},{appearance:"system"},{unknown:1},{monochrome:"url(x)"}]) {
    assert.throws(()=>api.setLook(bad));assert.equal(h.css(),second);
  }
  b();assert.equal(h.css(),original);
  const release=api.setLook({appearance:"light"});click(app,"Dark");release();
  assert(h.css().includes("color-scheme:dark"),"manual control takes ownership");
  app.dispose();assert.equal(app.services.size,0);assert.throws(()=>api.setLook({}));
});

test("API monochrome rotation changes the generated palette, and legacy ignores new-field garbage",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  assert.notDeepEqual(api.generateTheme({mode:"monochrome",monochrome:"#0099dd",rotation:0}),api.generateTheme({mode:"monochrome",monochrome:"#0099dd",rotation:45}));
  app.dispose();
  const old=JSON.stringify({theme:"bluepinkneon",hues:[224,359,134],rotation:0,appearance:"bogus",neutrals:"bogus"});
  const restored=host(new Map([["com.ranveer.bluepinkneon:theme:v2",old]])).boot();
  assert.equal(restored.services.get("chroma").getLook().appearance,"dark");
  assert.deepEqual(restored.services.get("chroma").getLook().neutrals,[false,false,false]);restored.dispose();
});

test("monochrome primary preserves the saved seeds, while Hue rotation is shared",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");rotate(app,129);const original=h.css(),seeds=api.getLook().hues;
  click(app,"Monochrome");input(app,"Primary").props.onChange({target:{value:"#ff7b00"}});
  assert.equal(api.getLook().rotation,129);click(app,"Trichrome");assert.equal(h.css(),original);
  click(app,"Monochrome");rotate(app,270);assert.equal(api.getLook().rotation,270);
  click(app,"Trichrome");assert.deepEqual(api.getLook().hues,seeds);assert.notEqual(h.css(),original);app.dispose();
});

test("a monochrome API color with no explicit angle agrees with the UI after rotation",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");rotate(app,129);
  const expected=api.generateTheme({monochrome:"#ff7b00"});
  click(app,"Monochrome");input(app,"Primary").props.onChange({target:{value:"#ff7b00"}});
  assert.deepEqual(api.generateTheme({}),expected);app.dispose();
});
