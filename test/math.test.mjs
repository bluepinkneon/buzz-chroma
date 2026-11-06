import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRoleEngine,deltaE,hexOklch,oklchHex,apca,wcag} from "../role-engine.js";
import {mapRoles} from "../role-map.js";
import {parse,over,measure} from "./measure.mjs";
import {PRESETS} from "../presets.js";
const graph=JSON.parse(readFileSync(new URL("./role-graph.json",import.meta.url),"utf8"));
const original=Object.fromEntries([...readFileSync(new URL("../shepherd-theme.css",import.meta.url),"utf8").matchAll(/(--[\w-]+):\s*(#[\da-f]{6});/gi)].map(m=>[m[1],m[2]]));
const engine=createRoleEngine(original);

test("host contrast graph passes every hue in both appearances and monochrome, including animated overlays",()=>{
  let configs=0,checks=0,minBody=Infinity,minMeta=Infinity,minWcag=Infinity;
  function verify(options) {
    const generated=engine.generate(options),roles=mapRoles(generated),cache=new Map();configs++;
    const resolve=role=>{assert(roles[role],`unmapped ${role}`);if(!cache.has(role))cache.set(role,parse(roles[role]));return cache.get(role);};
    const check=(fg,bg,target,context)=>{
      const floor=graph.thresholds[target]; assert(floor,`unknown target ${target}`);
      if(floor.exempt)return;
      const m=measure(resolve(fg),bg);checks++;
      const label=`${JSON.stringify(options)} ${fg} on ${context}: ${JSON.stringify(m)}`;
      if(floor.wcag!==undefined)assert(m.wcag+1e-7>=floor.wcag,label);
      if(floor.apcaAbs!==undefined)assert(m.apcaAbs+1e-7>=floor.apcaAbs,label);
      if(target==="body")minBody=Math.min(minBody,m.apcaAbs);
      if(target==="metadata")minMeta=Math.min(minMeta,m.apcaAbs);
      if(target==="body"||target==="metadata")minWcag=Math.min(minWcag,m.wcag);
    };
    for(const p of graph.pairs)check(p.foreground,resolve(p.background),p.target,p.background);
    for(const o of graph.overlays)for(const alpha of o.opacitySamples) {
      let bg=resolve(o.backdrop);for(const l of o.layers)bg=over(resolve(l.fill),bg,l.opacity==="sample"?alpha:l.opacity);
      for(const fg of o.foregrounds)check(fg,bg,o.targets[fg],`${o.id}@${alpha}`);
    }
    for(const group of graph.stateDistinctions) {
      const names=["normal","hover","pressed","selected","received","own","highlight","ordinary","self","mine"].filter(k=>group[k]);
      for(let a=0;a<names.length;a++)for(let b=a+1;b<names.length;b++) {
        const delta=deltaE(roles[group[names[a]]],roles[group[names[b]]]);
        assert(delta>=3,`${JSON.stringify(options)} ${group.id} ${names[a]}/${names[b]} delta=${delta}`);
      }
    }
    assert(generated.measurements.passes);
  }
  for(const appearance of ["dark","light"]) {
    for(let h=0;h<360;h++) {
      verify({appearance,hues:[h,(h+135)%360,(h+315)%360],mode:"color"});
      verify({appearance,hues:[h,(h+135)%360,0],mode:"duo"});
      verify({appearance,hues:[h,(h+135)%360,(h+315)%360],mode:"color",neutralGround:true});
      verify({appearance,hues:[h,(h+135)%360,0],mode:"duo",neutralGround:true});
      verify({appearance,monoHue:h,mode:"mono"});
    }
    verify({appearance,mode:"mono",neutral:true});
    // Independent hues and all per-picker neutral masks (deterministic).
    for(let n=0;n<256;n++)for(const mode of ["color","duo"])for(const neutralGround of [false,true])verify({appearance,mode,neutralGround,hues:[n*137%360,n*53%360,n*199%360],neutrals:[!!(n&1),!!(n&2),!!(n&4)]});
    for(const preset of PRESETS) {
      verify({appearance,mode:"color",hues:preset.hues,neutrals:preset.neutrals,surfaceOffset:preset.surfaceOffset,neutralGround:preset.neutralGround});
      verify({appearance,mode:"duo",hues:preset.hues,neutrals:preset.neutrals,surfaceOffset:preset.surfaceOffset,neutralGround:preset.neutralGround});
      verify({appearance,mode:"mono",hues:preset.hues,monoHue:preset.hues[0],neutral:preset.defaultNeutral||preset.neutrals?.[0]||false,surfaceOffset:preset.surfaceOffset,neutralGround:preset.neutralGround});
      verify({appearance,mode:"mono",hues:preset.hues,neutral:true,surfaceOffset:preset.surfaceOffset,neutralGround:preset.neutralGround});
    }
  }
  console.log(JSON.stringify({configs,contrastChecks:checks,minBody,minMetadata:minMeta,minReadableWcag:minWcag}));
});

test("one-hue state ladder has even lightness steps, distinct competing states, and a continuous circular seam",()=>{
  for(const appearance of ["dark","light"]) {
    let previous;
    for(let h=0;h<=360;h++) {
      const result=engine.generate({appearance,mode:"mono",monoHue:h%360});
      const s=result.surfaces;
      for(const [a,b] of [["panel","hover"],["own","selected"],["selected","highlight"],["ownHover","ownHighlight"],["prominent","prominentHover"],["prominentHover","prominentPressed"]]) {
        const de=deltaE(s[a],s[b]);assert(de>=3,`${appearance} ${h} ${a}/${b}: ${de}`);
      }
      for(const [a,b] of [["panel","hover"],["own","selected"],["selected","highlight"]]) {
        assert(Math.abs(Math.abs(hexOklch(s[a]).l-hexOklch(s[b]).l)-.035)<.004);
      }
      if(previous)for(const key of Object.keys(s))assert(deltaE(previous[key],s[key])<1.6,`${key} discontinuity at ${h}`);
      previous=s;
    }
    const gray=engine.generate({appearance,mode:"mono",neutral:true});
    for(const group of [gray.surfaces,gray.inks,gray.borders])for(const hex of Object.values(group))assert(/^#([\da-f]{2})\1\1$/.test(hex),hex);
    for(const [name,hex] of Object.entries(gray.categorical)) {
      const h=hexOklch(hex).h;assert(h>=290&&h<=325,`${name} must stay purple: ${h}`);
    }
  }
});

test("gamut mapping keeps luminance monotone through the light-ink solver range",()=>{
  for(let h=0;h<360;h++)for(const c of [0,.1,.2]) {
    let before=0;
    for(let step=0;step<=1000;step++) {
      const hex=oklchHex(step/1000,c,h),value=wcag(hex,"#000000");
      assert(value+1e-9>=before,`${h}/${c}/${step}`);before=value;
    }
  }
  assert(apca("#000000","#ffffff")>100);assert(apca("#ffffff","#000000")<-100);
});

test("semantic fills keep standard red/green/amber meanings independently of rotation or monochrome",()=>{
  for(const appearance of ["dark","light"]) {
    const reference=engine.generate({appearance}).signals;
    for(const [role,lo,hi] of [["danger",15,35],["success",135,165],["warning",65,110]]) {
      const h=hexOklch(reference[role].fill).h;assert(h>=lo&&h<=hi,`${appearance} ${role}: ${h}`);
    }
    for(let hue=0;hue<360;hue++) {
      const result=engine.generate({appearance,mode:"mono",monoHue:hue});
      for(const role of ["danger","success","warning","info"])assert.equal(result.signals[role].fill,reference[role].fill);
      for(const [role,lo,hi,minC] of [["danger",15,35,appearance==="light"?.15:.095],["success",135,165,.1],["warning",60,90,.08]]) {
        const ink=hexOklch(result.signals[role].ink);
        assert(ink.h>=lo&&ink.h<=hi&&ink.c>=minC,`${appearance} ${hue} ${role}: ${JSON.stringify(ink)}`);
      }
      for(const [a,b] of [["danger","warning"],["danger","success"],["success","warning"]])assert(deltaE(result.signals[a].ink,result.signals[b].ink)>8);
      for(const role of ["danger","warning","success","info"])for(const bg of Object.values(result.surfaces)) {
        if([result.surfaces.prominent,result.surfaces.prominentHover,result.surfaces.prominentPressed].includes(bg))continue;
        assert(wcag(result.signals[role].icon,bg)>=3);
      }
      // The same measured separation floor as competing UI states. Light fills
      // are intentionally pastel, and labels/icons retain the signal meaning.
      for(const [a,b] of [["danger","success"],["danger","warning"],["success","warning"]])assert(deltaE(result.signals[a].fill,result.signals[b].fill)>3);
    }
  }
});
