import test from 'node:test';
import assert from 'node:assert/strict';
import {host,find,variables} from './host.mjs';
import {hexOklch,wcag} from '../role-engine.js';
import {parse,over,measure} from './measure.mjs';

test('compiled presence and activity roles retain semantic families through rotation and neutral choices',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),base=api.getLook();
  let states=0,tints=0;
  for(const mode of ['color','duo','mono'])for(const appearance of ['light','dark'])for(const rotation of [0,89,180,271])for(const gray of [false,true]) {
    const live=api.setLook({...base,hues:[14,213,98],monoHue:99,mode,appearance,rotation,
      neutral:gray,neutrals:[gray,gray,gray],neutralGround:true,surfaceOffset:0});
    const roles=api.generateTheme(api.getLook());states++;
    assert(/^#([\da-f]{2})\1\1$/.test(roles['--status-offline']));
    assert.equal(roles['--status-away'],roles['--icon-warning']);
    assert.equal(roles['--status-avatar-online'],roles['--icon-success']);
    for(const [surface,ink,family,lo,hi] of [
      ['--surface-status-success','--text-on-status-success','success',135,165],
      ['--surface-status-danger','--text-on-status','danger',15,35],
    ]) {
      assert.equal(roles[surface],roles[`--affordance-${family}`]);
      assert.equal(roles[ink],roles[`--text-${family}`]);
      const hue=hexOklch(roles[surface]).h;assert(hue>=lo&&hue<=hi);
      const actual=measure(parse(roles[ink]),parse(roles[surface]));
      assert(actual.wcag>=4.5&&actual.apcaAbs>=60);
    }
    for(const background of ['--surface-base','--surface-panel','--surface-popover','--surface-message-own','--surface-control-selected']) {
      assert(wcag(roles['--status-offline'],roles[background])>=3);
      assert(wcag(roles['--status-away'],roles[background])>=3);
    }
    // Away tints use the icon shade; their actual label stays text-warning.
    for(const background of ['--surface-base','--surface-panel','--surface-popover'])for(const alpha of [.12,.18,.24]) {
      const bg=over(parse(roles['--status-away']),parse(roles[background]),alpha);
      const actual=measure(parse(roles['--text-warning']),bg);tints++;
      assert(actual.wcag>=4.5&&actual.apcaAbs>=60);
    }
    const painted=h.css().match(/:root\[data-bluepinkneon\]\{color-scheme:[^}]+\}/)[0];
    for(const key of ['--surface-status-success','--text-on-status-success','--surface-status-danger','--text-on-status'])assert(painted.includes(`${key}:${roles[key]}!important;`));
    live.dispose();
  }
  assert.equal(h.saved.size,0);app.dispose();console.log(JSON.stringify({semanticStates:states,awayTintChecks:tints}));
});

test('legacy removal exports use the protected Red family even when Secondary is green or gray',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  for(const mode of ['color','duo','mono'])for(const rotation of [0,90,180,270])for(const monochrome of ['#00a03f','#808080']) {
    const options={mode,rotation,colors:['#0099dd','#00a03f','#00a988']};
    if(mode==='mono')options.monochrome=monochrome;
    const live=api.setLook(options),raw=variables(h.css());
    assert.equal(raw.get('--token-rem-bg'),raw.get('--palette-contrast-7'));
    assert.equal(raw.get('--token-rem-txt'),raw.get('--palette-contrast-10'));
    const red=hexOklch(raw.get('--token-rem-bg'));assert(red.h>=15&&red.h<=35&&red.c>.1);
    live.dispose();
  }
  app.dispose();
});

test('preview identifies source ramps while Status and diffs uses the final shared signal roles',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),samples=[];
  for(const appearance of ['dark','light']) {
    const live=api.setLook({preset:'blue-pink-neon',appearance});
    const raw=variables(h.css()),roles=api.generateTheme(api.getLook());
    const preview=find(app.tree(),n=>n.props?.['aria-label']==='Generated colors');
    for(const heading of ['Source ramps','ANSI exports','Status and diffs'])assert(find(preview,n=>n.tag==='h3'&&n.children[0]===heading));
    const shade=find(preview,n=>n.props?.['aria-label']===`Neon 10 ${raw.get('--palette-light-10')}`);
    assert.equal(shade.props.style.background,'var(--palette-light-10)');
    assert.notEqual(raw.get('--palette-light-10'),roles['--text-standard']);
    const success=find(preview,n=>n.props?.className==='chroma-status-tile'&&n.children[0].children[0]==='Added · Success');
    assert.equal(success.props.style.background,'var(--affordance-success)');
    assert.equal(success.props.style.color,'var(--text-success)');
    assert.equal(find(success,n=>n.tag==='code').children[0],roles['--text-success']);
    samples.push({source:raw.get('--palette-light-10'),ink:roles['--text-standard']});live.dispose();
  }
  assert.equal(samples[0].source,samples[1].source);assert.notEqual(samples[0].ink,samples[1].ink);app.dispose();
});
