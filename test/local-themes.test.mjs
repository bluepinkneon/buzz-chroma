import test from "node:test";
import assert from "node:assert/strict";
import {host,input,click,select,find} from "./host.mjs";
import {LIBRARY_KEY,LOCAL_LIMIT,paletteSnapshot} from "../local-themes.js";

function saveNamed(app,name) {input(app,"Theme name").props.onChange({target:{value:name}});click(app,"Save locally");}

test("custom color and monochrome themes save locally, reload, and delete without changing the active colors",()=>{
  const h=host();let app=h.boot();select(app,"john-wick");click(app,"Monochrome");click(app,"Light");
  saveNamed(app,"My Midnight Theme");const css=h.css();
  assert.equal(find(app.tree(),n=>n.tag==="select").props.value,"local:my-midnight-theme");
  assert.equal(JSON.parse(h.saved.get(LIBRARY_KEY))[0].name,"my-midnight-theme");
  app.dispose();app=h.boot();assert.equal(h.css(),css);
  select(app,"blue-pink-neon");click(app,"Dark");select(app,"local:my-midnight-theme");
  assert.equal(app.services.get("chroma").getLook().appearance,"dark","local theme keeps current appearance");
  assert.equal(app.services.get("chroma").getLook().mode,"mono","saved mode restores");
  const active=h.css();click(app,"Remove saved theme");assert.equal(h.css(),active);
  assert.deepEqual(JSON.parse(h.saved.get(LIBRARY_KEY)),[]);app.dispose();
});

test("duplicate and built-in names are preserved by suffixing new saves",()=>{
  const h=host(),app=h.boot();saveNamed(app,"blue-pink-neon");saveNamed(app,"blue-pink-neon");
  assert.deepEqual(JSON.parse(h.saved.get(LIBRARY_KEY)).map(t=>t.name),["blue-pink-neon-2","blue-pink-neon-3"]);
  saveNamed(app,"!!!");assert.equal(JSON.parse(h.saved.get(LIBRARY_KEY)).length,2);
  assert(JSON.stringify(app.tree()).includes("letters a–z"));app.dispose();
});

test("malformed, oversized or colliding local library entries are refused without overwriting stored bytes",()=>{
  for(const raw of ["{","{}",JSON.stringify(Array(LOCAL_LIMIT+1).fill({})),JSON.stringify([{name:"bad-name",look:{}}]),JSON.stringify([{name:"blue-pink-neon",look:{}}]),JSON.stringify([{name:"huge",look:{},padding:"x".repeat(2049)}]),"x".repeat(131073)]) {
    const h=host(new Map([[LIBRARY_KEY,raw]])),app=h.boot();
    assert(JSON.stringify(app.tree()).includes("stored data has been left untouched"));
    assert.equal(h.saved.get(LIBRARY_KEY),raw);assert(h.css());app.dispose();
  }
});

test("local storage failures stay visible and a full library refuses another save",()=>{
  const h=host(),app=h.boot();const look=app.services.get("chroma").getLook();
  globalThis.localStorage.setItem=()=>{throw Error("quota");};saveNamed(app,"offline");
  assert(JSON.stringify(app.tree()).includes("could not be saved"));app.dispose();
  const entries=Array.from({length:LOCAL_LIMIT},(_,i)=>({name:`theme-${i}`,look:paletteSnapshot(look)}));
  const full=host(new Map([[LIBRARY_KEY,JSON.stringify(entries)]])),boot=full.boot();
  saveNamed(boot,"extra");assert.equal(JSON.parse(full.saved.get(LIBRARY_KEY)).length,LOCAL_LIMIT);
  assert(JSON.stringify(boot.tree()).includes("Remove one first"));boot.dispose();
});

test("full snapshots round-trip through the callable API and hidden sparse arrays cannot bypass validation",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  for(const preset of ["blue-pink-neon","daredevil","miyamoto-musashi"]) {
    select(app,preset);const look=api.getLook(),css=h.css();
    const dispose=api.setLook(look);assert.equal(h.css(),css);dispose();assert.equal(h.css(),css);
    for(const bad of [{...look,hues:Array(3)},{...look,neutrals:Array(3)},{...look,surfaceOffset:45}])assert.throws(()=>api.setLook(bad));
    assert.equal(h.css(),css);
  }
  app.dispose();
});
