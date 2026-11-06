import test from 'node:test';
import assert from 'node:assert/strict';
import {host} from './host.mjs';
import {hexOklch} from '../role-engine.js';

// Resting-chat surrogate, not universal pixel coverage or a perceptual theorem.
// The broad background has much more area than controls or an own-message bubble.
const area = {
  '--bg-app': .50, '--surface-panel': .20, '--surface-inset': .10,
  '--surface-message-own': .05, '--surface-navigation-selected': .02,
  '--affordance-prominent': .005, '--text-standard': .05,
  '--text-metadata': .01, '--text-link': .003, '--border-focus': .002,
  '--border-standard': .01,
};
const distance = (a,b) => Math.abs((a-b+540)%360-180);

test('co-dominant character defaults retain both or all three signature colors in modeled chat presence',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),results=[];
  for(const id of ['spider-man','wonder-woman','joker']) {
    const preset=api.listPresets().find(p=>p.id===id);
    const seeds=preset.hues.filter((_,index)=>!preset.neutrals[index]);
    for(const appearance of id==='spider-man'?['dark','light']:[preset.defaultAppearance]) {
      const roles=api.generateTheme({preset:id,appearance});
      const presence=seeds.map(()=>0);let total=0;
      for(const [role,weight] of Object.entries(area)) {
        const {h,c}=hexOklch(roles[role]);if(c<.02)continue;
        const nearest=seeds.map((seed,index)=>({index,d:distance(h,seed)})).sort((a,b)=>a.d-b.d)[0];
        const value=weight*c;total+=value;
        if(nearest.d<=35)presence[nearest.index]+=value;
      }
      assert(total>.001,`${id}/${appearance} cannot pass by removing all color`);
      const shares=presence.map(value=>value/total);
      for(const share of shares)assert(share>=.20,`${id}/${appearance} signature crowded out: ${shares}`);
      results.push({id,appearance,modeledShares:shares.map(value=>Math.round(value*100))});
    }
  }
  app.dispose();console.log(JSON.stringify({modeledCharacterPresence:results}));
});
