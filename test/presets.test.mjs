import test from "node:test";
import assert from "node:assert/strict";
import {PRESETS} from "../presets.js";
import {host,find,click,select,input,rotate} from "./host.mjs";
import {hexOklch,deltaE,createRoleEngine} from "../role-engine.js";
import {mapRoles} from "../role-map.js";
import {readFileSync} from "node:fs";

test("named palettes supply three distinct hues and keep appearance with a recommended mode",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  assert(!JSON.stringify(app.tree()).includes("Your palette"));
  assert.equal(find(app.tree(),n=>n.tag==="select").props.value,"blue-pink-neon");
  click(app,"Auto");click(app,"Monochrome");
  for(const preset of PRESETS) {
    select(app,preset.id);
    const look=api.getLook();assert.equal(look.preset,preset.id);
    assert.deepEqual(look.hues,preset.hues);assert.equal(look.appearance,"auto");
    assert.deepEqual(look.neutrals,preset.neutrals??[false,false,false]);
    assert.equal(look.mode,preset.defaultMode);assert.equal(look.monoHue,null);click(app,"Monochrome");
    assert.equal(api.getLook().effectiveHues[0],preset.hues[0]);
    assert(/^[a-z]+(?:-[a-z]+)*$/.test(preset.id));
    for(let a=0;a<3;a++)for(let b=a+1;b<3;b++) {
      const distance=Math.abs(((preset.hues[a]-preset.hues[b]+540)%360)-180);
      assert(distance>=45,`${preset.id}: ${distance}`);
    }
  }
  select(app,"daredevil");click(app,"Monochrome");assert.equal(api.getLook().monoHue,null);assert.deepEqual(api.getLook().effectiveHues,[25,25,25]);
  app.dispose();
});

test("every default palette is distinct, including gray character accents",()=>{
  const original=Object.fromEntries([...readFileSync(new URL("../shepherd-theme.css",import.meta.url),"utf8").matchAll(/(--[\w-]+):\s*(#[\da-f]{6});/gi)].map(m=>[m[1],m[2]]));
  const engine=createRoleEngine(original);
  const keys=["--surface-base","--surface-panel","--affordance-prominent","--surface-message-own","--text-primary","--text-link","--affordance-selected"];
  for(const appearance of ["dark","light"]) {
    const rendered=PRESETS.map(p=>mapRoles(engine.generate({appearance,hues:p.hues,surfaceOffset:p.surfaceOffset,mode:p.defaultMode,monoHue:p.hues[0],neutral:p.defaultNeutral,neutrals:p.neutrals})));
    for(let a=0;a<rendered.length;a++)for(let b=a+1;b<rendered.length;b++) {
      assert.notDeepEqual(rendered[a],rendered[b],`${appearance}: ${PRESETS[a].id}/${PRESETS[b].id}`);
      if(appearance==="dark")assert(Math.max(...keys.map(key=>deltaE(rendered[a][key],rendered[b][key])))>=5,`${PRESETS[a].id}/${PRESETS[b].id}`);
    }
  }
});

test("monochrome follows the chosen primary, allows an override, and can relink",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");select(app,"daredevil");
  click(app,"Monochrome");const red=h.css();
  input(app,"Primary").props.onChange({target:{value:"#0099dd"}});
  assert.notEqual(h.css(),red);assert.notEqual(api.getLook().monoHue,null);
  click(app,"Trichrome");click(app,"Monochrome");assert.notEqual(h.css(),red,"custom mono survives mode switch");
  click(app,"Use primary hue");assert.equal(h.css(),red);assert.equal(api.getLook().monoHue,null);
  click(app,"Trichrome");rotate(app,45);click(app,"Monochrome");
  assert.equal(api.getLook().effectiveHues[0],70);
  select(app,"princess-leia");click(app,"Monochrome");assert.equal(api.getLook().rotation,0);assert.equal(api.getLook().monoHue,null);
  assert.equal(api.getLook().effectiveHues[0],255);
  app.dispose();
});

test("gray primary links to neutral monochrome and presets survive restart",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  input(app,"Primary").props.onChange({target:{value:"#808080"}});click(app,"Monochrome");
  assert.equal(input(app,"Primary").props.value.slice(1,3),input(app,"Primary").props.value.slice(3,5));
  click(app,"Tinted");assert.notEqual(api.getLook().monoHue,null);
  click(app,"Use primary hue");assert.equal(api.getLook().monoHue,null);
  select(app,"daredevil");click(app,"Light");const css=h.css();app.dispose();
  const reboot=h.boot();assert.equal(h.css(),css);assert.equal(reboot.services.get("chroma").getLook().preset,"daredevil");reboot.dispose();
});

test("other plugins can choose presets without mutating the preset registry",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma"),before=h.css();
  const list=api.listPresets();list[0].hues[0]=9;assert.equal(api.listPresets()[0].hues[0],224);
  assert.throws(()=>api.setLook({preset:"missing"}));assert.equal(h.css(),before);
  const undo=api.setLook({preset:"daredevil",mode:"monochrome",appearance:"light"});
  assert.equal(api.getLook().preset,"daredevil");assert.equal(api.getLook().monoHue,null);
  assert.equal(api.getLook().appearance,"light");assert.equal(h.saved.size,0);
  undo();assert.equal(h.css(),before);app.dispose();assert.throws(()=>api.listPresets());
});

test("preset signature grounds rotate continuously and persist without changing legacy looks",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  select(app,"daredevil");const base=api.generateTheme({});
  const hue=hexOklch(base["--surface-panel"]).h;
  assert(hue>=15&&hue<=35,`daredevil ground must be red, got ${hue}`);
  rotate(app,1);const next=api.generateTheme({});
  assert.equal(api.getLook().surfaceOffset,0);assert.equal(api.getLook().preset,"custom");
  for(const role of ["--surface-base","--surface-panel","--affordance-prominent","--text-standard"])assert(deltaE(base[role],next[role])<1.6,role);
  const css=h.css();app.dispose();const reboot=h.boot();assert.equal(h.css(),css);reboot.dispose();
  const key="com.ranveer.bluepinkneon:theme:v3";
  const legacy={theme:"bluepinkneon",hues:[224,359,179],rotation:0,mode:"color",monoHue:null,neutral:false,neutrals:[false,false,false],appearance:"dark"};
  const old=host(new Map([[key,JSON.stringify(legacy)]])).boot();assert.equal(old.services.get("chroma").getLook().surfaceOffset,90);old.dispose();
});
