import test from "node:test";
import assert from "node:assert/strict";
import {host,variables} from "./host.mjs";
import {deltaE} from "../role-engine.js";

test("named ANSI slots remain distinct across the catalog, modes and rotations",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  const original=variables(h.css()),names=["black","red","green","yellow","blue","magenta","cyan","white"];
  let checks=0,minimum=Infinity;
  for(const preset of api.listPresets())for(const mode of ["color","duo","mono"])for(const rotation of [0,90,150,270]) {
    const live=api.setLook({preset:preset.id,mode,rotation}),values=variables(h.css());
    for(const prefix of ["","bright-"]) {
      for(const name of names.slice(1,-1))assert.equal(values.get(`--ansi-${prefix}${name}`),original.get(`--ansi-${prefix}${name}`));
      for(let a=0;a<names.length;a++)for(let b=a+1;b<names.length;b++) {
        const difference=deltaE(values.get(`--ansi-${prefix}${names[a]}`),values.get(`--ansi-${prefix}${names[b]}`));
        assert(difference>=5,`${preset.id} ${mode} ${rotation} ${prefix}${names[a]}/${names[b]}: ${difference}`);
        minimum=Math.min(minimum,difference);checks++;
      }
    }
    live.dispose();
  }
  console.log(JSON.stringify({ansiPairChecks:checks,minAnsiDeltaE:minimum}));app.dispose();
});
