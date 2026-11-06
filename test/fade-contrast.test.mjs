import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {host} from './host.mjs';
import {fadeChoice} from '../palette-fade.js';
import {deltaE} from '../role-engine.js';
import {parse,over,measure} from './measure.mjs';
const graph=JSON.parse(readFileSync(new URL('./role-graph.json',import.meta.url),'utf8'));

test('fades regenerate contrast-safe roles at the seam and through every preset, mode and polarity',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');let frames=0,checks=0;
  for(const preset of api.listPresets())for(const mode of ['trichrome','bichrome','monochrome'])for(const appearance of ['dark','light']) {
    const handle=api.setLook({preset:preset.id,mode,appearance}),from=api.getLook();handle();
    const to={...structuredClone(from),hues:from.hues.map(x=>(x+173)%360),rotation:359,monoHue:from.monoHue===null?null:(from.monoHue+179)%360};
    for(const progress of [0,.1,.25,.5,.75,.9,1]) {
      const options=fadeChoice(from,to,progress),roles=api.generateTheme(options),cache=new Map();frames++;
      const resolve=role=>{assert(roles[role],role);if(!cache.has(role))cache.set(role,parse(roles[role]));return cache.get(role);};
      const check=(fg,bg,target)=>{const floor=graph.thresholds[target];if(floor.exempt)return;const result=measure(resolve(fg),bg);checks++;
        assert(floor.wcag===undefined||result.wcag+1e-7>=floor.wcag,`${preset.id}/${mode}/${appearance}/${progress} ${fg} WCAG`);
        assert(floor.apcaAbs===undefined||result.apcaAbs+1e-7>=floor.apcaAbs,`${preset.id}/${mode}/${appearance}/${progress} ${fg} APCA`);};
      for(const pair of graph.pairs)check(pair.foreground,resolve(pair.background),pair.target);
      for(const layer of graph.overlays)for(const alpha of layer.opacitySamples) {
        let bg=resolve(layer.backdrop);for(const part of layer.layers)bg=over(resolve(part.fill),bg,part.opacity==='sample'?alpha:part.opacity);
        for(const fg of layer.foregrounds)check(fg,bg,layer.targets[fg]);
      }
      for(const group of graph.stateDistinctions) {
        const names=['normal','hover','pressed','selected','received','own','highlight','ordinary','self','mine'].filter(key=>group[key]);
        for(let a=0;a<names.length;a++)for(let b=a+1;b<names.length;b++)assert(deltaE(roles[group[names[a]]],roles[group[names[b]]])>=3,`${preset.id}/${mode}/${appearance}/${progress} ${group.id}`);
      }
    }
  }
  app.dispose();console.log(JSON.stringify({fadeFrames:frames,contrastChecks:checks}));
});
