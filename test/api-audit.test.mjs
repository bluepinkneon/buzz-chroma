import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {host,input,click,select,find} from './host.mjs';
import {LIBRARY_KEY,paletteSnapshot} from '../local-themes.js';
const key='com.ranveer.bluepinkneon:theme:v3';
const wrap=x=>((x%360)+360)%360;
const seed=(n,mode)=>({theme:'bluepinkneon',hues:[n*137%360,n*53%360,n*199%360],rotation:n*73%360,mode,
  neutrals:[!!(n&1),!!(n&2),!!(n&4)],monoHue:n%2?null:n*17%360,neutral:!!(n&8),appearance:n%2?'light':'dark',surfaceOffset:n%2?0:90,localName:null});
const boot=state=>{const h=host(new Map([[key,JSON.stringify(state)]]));return {h,app:h.boot()};};
const saveNamed=(app,name)=>{input(app,'Theme name').props.onChange({target:{value:name}});click(app,'Save locally');};

test('snapshot inputs are isolated for setLook and live updates, including observer refreshes',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  const snapshot=api.getLook(),look=api.setLook(snapshot),before=api.getLook(),css=h.css();
  snapshot.neutrals[0]='not-a-boolean';snapshot.hues[0]=123;
  assert.deepEqual(api.getLook(),before);h.mode('light');assert.equal(h.css(),css);
  const patch=api.getLook();look.update(patch);patch.neutrals[1]=true;patch.hues[1]=234;
  assert.deepEqual(api.getLook(),before);assert.equal(h.css(),css);look.dispose();app.dispose();
});

test('all emitted mode IDs can be used in patches; coercible values and contradictions fail atomically',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  for(const p of api.listPresets()){const l=api.setLook({preset:p.id,mode:p.defaultMode});assert.equal(api.getLook().mode,p.defaultMode);l.dispose();}
  const before=h.css();
  for(const bad of [{mode:['bichrome']},{mode:{toString:()=> 'mono'}},{mode:true},
    {mode:'trichrome',monochrome:'#cc2233'},{mode:'bichrome',colors:['#0099dd','#dd4083'],monochrome:'#cc2233'},
    {mode:'monochrome',colors:['#0099dd'],monochrome:'#cc2233'}]){
    assert.throws(()=>api.setLook(bad),TypeError);assert.equal(h.css(),before);
  }
  const duo=api.setLook({preset:'daredevil'}),duoCss=h.css();
  assert.throws(()=>duo.update({colors:['#0099dd','#dd4083'],monochrome:'#cc2233'}),TypeError);assert.equal(h.css(),duoCss);duo.dispose();
  app.dispose();
});

test('new handles and generation use the saved look; active snapshots copy only when requested',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),original=api.getLook(),generated=api.generateTheme();
  const a=api.setLook({preset:'john-wick'}),b=api.setLook({appearance:'light'});
  assert.deepEqual(api.getLook().hues,original.hues);assert.equal(api.getLook().appearance,'light');
  assert.deepEqual(api.generateTheme(),generated);a.dispose();assert.deepEqual(api.getLook().hues,original.hues);
  b.dispose();const c=api.setLook({preset:'john-wick'}),d=api.setLook(api.getLook());c.dispose();assert.equal(api.getLook().preset,'john-wick');d.dispose();app.dispose();
});

test('color-edit properties: keep rotation, unedited seeds and mono overrides; UI and API agree',()=>{
  for(const mode of ['color','duo','mono'])for(let n=0;n<32;n++){
    const state=seed(n,mode),{h,app}=boot(state),api=app.services.get('chroma');
    const labels=mode==='mono'?['Primary']:mode==='duo'?['Primary','Secondary']:['Primary','Secondary','Neon'];
    const index=n%labels.length,values=labels.map(label=>input(app,label).props.value),picked=['#0099dd','#cc2233','#ff7b00','#808080'][n%4];
    values[index]=picked;const before=api.getLook();input(app,labels[index]).props.onChange({target:{value:picked}});
    const after=api.getLook(),css=h.css();assert.equal(after.rotation,state.rotation);
    for(let j=0;j<3;j++)if(mode==='mono'||j!==index)assert.equal(after.hues[j],before.hues[j]);
    if(mode!=='mono')assert.equal(after.monoHue,before.monoHue);
    app.dispose();const other=boot(state),otherApi=other.app.services.get('chroma');
    const live=otherApi.setLook({mode,colors:values});assert.equal(other.h.css(),css,`${mode}/${n}`);live.dispose();other.app.dispose();
  }
});

test('explicit rotation uses base colors without rebaking unprovided seeds',()=>{
  for(let n=0;n<48;n++){
    const state=seed(n,'color'),{h,app}=boot(state),api=app.services.get('chroma'),r=n*29%360;
    const live=api.setLook({mode:'bichrome',colors:['#0099dd','#dd4083'],rotation:r});
    const look=api.getLook();assert.equal(look.hues[2],state.hues[2]);assert.equal(look.monoHue,state.monoHue);
    live.update({mode:'trichrome'});assert.equal(api.getLook().effectiveHues[2],wrap(state.hues[2]+r));live.dispose();app.dispose();
  }
});

test('effective neutral flags describe the rendered families and gray toggles retain the primary link',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma');
  const a=api.setLook({preset:'batman'});assert.deepEqual(api.getLook().effectiveNeutrals,[true,false,false]);a.dispose();
  const b=api.setLook({mode:'bichrome',colors:['#808080','#ffffff']});assert.deepEqual(api.getLook().effectiveNeutrals,[true,true,true]);b.dispose();
  click(app,'Monochrome');click(app,'Neutral gray');assert.equal(api.getLook().monoHue,null);assert.deepEqual(api.getLook().effectiveNeutrals,[true,true,true]);
  click(app,'Tinted');assert.equal(api.getLook().monoHue,null);app.dispose();
});

test('generation errors cannot publish a new handle, update, or saved UI state',()=>{
  const h=host(),app=h.boot(),api=app.services.get('chroma'),live=api.setLook({preset:'john-wick'}),before=api.getLook(),css=h.css();
  const light=find(app.tree(),n=>n.tag==='button'&&n.children[0]==='Light');
  const cos=Math.cos,warn=console.warn;Math.cos=()=>{throw Error('probe engine failure');};console.warn=()=>{};
  try{
    assert.throws(()=>api.setLook({preset:'daredevil'}),/probe engine failure/);
    assert.throws(()=>live.update({rotation:12}),/probe engine failure/);
    light.props.onClick();assert.deepEqual(api.getLook(),before);assert.equal(h.css(),css);assert.equal(h.saved.size,0);
  }finally{Math.cos=cos;console.warn=warn;}
  live.dispose();app.dispose();
});

test('library quota notices remain truthful after unrelated saves and clear after a durable library write',()=>{
  const h=host(),app=h.boot(),write=globalThis.localStorage.setItem;
  globalThis.localStorage.setItem=(k,v)=>{if(k===LIBRARY_KEY)throw Error('quota');write(k,v);};
  saveNamed(app,'only-this-session');click(app,'Light');
  assert(JSON.stringify(app.tree()).includes('saved only for this session'));assert.equal(h.saved.get(LIBRARY_KEY),undefined);
  globalThis.localStorage.setItem=write;saveNamed(app,'now-durable');assert.equal(JSON.parse(h.saved.get(LIBRARY_KEY)).length,2);
  assert(!JSON.stringify(app.tree()).includes('saved only for this session'));app.dispose();
});

test('stale library writes refuse to overwrite another window, and built-in name collisions remain loadable',()=>{
  const h=host(),app=h.boot(),look=paletteSnapshot(app.services.get('chroma').getLook());
  const external=JSON.stringify([{name:'other-window',look}]);h.saved.set(LIBRARY_KEY,external);saveNamed(app,'my-theme');
  assert.equal(h.saved.get(LIBRARY_KEY),external);assert(JSON.stringify(app.tree()).includes('changed in another window'));app.dispose();
  const stored=JSON.stringify([{name:'zelda',look}]),next=host(new Map([[LIBRARY_KEY,stored]])),loaded=next.boot();
  select(loaded,'local:zelda');assert.equal(find(loaded.tree(),n=>n.tag==='select').props.value,'local:zelda');
  saveNamed(loaded,'zelda');assert.deepEqual(JSON.parse(next.saved.get(LIBRARY_KEY)).map(x=>x.name),['zelda','zelda-2']);loaded.dispose();
});

test('a stale Reset reloads a repaired library instead of deleting the other window’s new themes',()=>{
  const h=host(new Map([[LIBRARY_KEY,'{unreadable']])),app=h.boot(),look=paletteSnapshot(app.services.get('chroma').getLook());
  const repaired=JSON.stringify([{name:'keep-me',look}]);h.saved.set(LIBRARY_KEY,repaired);
  click(app,'Reset local library');assert.equal(h.saved.get(LIBRARY_KEY),repaired);
  assert(!find(app.tree(),n=>n.tag==='button'&&n.children[0]==='Reset local library'));
  select(app,'local:keep-me');assert.equal(find(app.tree(),n=>n.tag==='select').props.value,'local:keep-me');app.dispose();
});

test('unknown library reads refuse Save and Reset without overwriting or dropping session-only changes',()=>{
  const h=host(),app=h.boot(),write=globalThis.localStorage.setItem,read=globalThis.localStorage.getItem;
  globalThis.localStorage.setItem=(k,v)=>{if(k===LIBRARY_KEY)throw Error('quota');write(k,v);};saveNamed(app,'session-one');
  globalThis.localStorage.getItem=k=>{if(k===LIBRARY_KEY)throw Error('unreadable');return read(k);};saveNamed(app,'not-added');
  assert.equal(h.saved.get(LIBRARY_KEY),undefined);click(app,'Light');assert(JSON.stringify(app.tree()).includes('saved only for this session'));
  globalThis.localStorage.getItem=read;globalThis.localStorage.setItem=write;saveNamed(app,'durable');assert.deepEqual(JSON.parse(h.saved.get(LIBRARY_KEY)).map(x=>x.name),['session-one','durable']);app.dispose();
});

test('preview exposes all source shades, ANSI names and semantic colors; Buzz default clears it',()=>{
  const h=host(),app=h.boot(),tree=app.tree();
  const preview=find(tree,n=>n.props?.['aria-label']==='Generated colors');assert(preview);
  for(const label of ['Primary shades','Neon shades','Normal console colors','Bright console colors'])assert(find(preview,n=>n.props?.['aria-label']===label));
  const serialized=JSON.stringify(preview);for(const name of ['Added · Success','Removed · Danger','Warning','Information','Bright cyan'])assert(serialized.includes(name));
  const source=readFileSync(new URL('../sidebar-icon.svg',import.meta.url),'utf8');assert(source.includes('currentColor'));
  select(app,'default');assert(!find(app.tree(),n=>n.props?.['aria-label']==='Generated colors'));assert.equal(h.styles.size,0);app.dispose();
});
