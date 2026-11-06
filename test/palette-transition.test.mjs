import test from "node:test";
import assert from "node:assert/strict";
import {ownPaletteTransition} from "../palette-transition.js";
import {host,select} from "./host.mjs";

const key="data-chroma-changing";
test("palette commit guard is bounded, restarts frames and restores foreign flags",()=>{
  const h=host();h.attributes.set(key,"before");
  const guard=ownPaletteTransition(document);guard.begin();assert.equal(h.frames.size,1);
  guard.begin();assert.equal(h.frames.size,1,"a newer commit cancels the older frame");
  h.flushFrames();assert.equal(h.attributes.get(key),"before");assert.equal(h.frames.size,0);
  guard.begin();h.attributes.set(key,"foreign");h.flushFrames();assert.equal(h.attributes.get(key),"foreign");
  guard.begin();h.flushFrames();assert.equal(h.attributes.get(key),"foreign");
  guard.begin();guard.dispose();assert.equal(h.frames.size,0);assert.equal(h.attributes.get(key),"foreign");assert.equal(h.styles.size,0);
});
test("shipped palette changes guard the complete commit and clean up on default and disable",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");h.flushFrames();
  api.setLook({appearance:"light"});assert(h.attributes.has(key));assert.equal(h.frames.size,1);
  const transition=[...h.styles].find(style=>style.dataset.role==="palette-transition");assert(transition.textContent.includes("transition:none!important"));
  h.flushFrames();assert(!h.attributes.has(key));
  select(app,"default");assert(h.attributes.has(key));h.flushFrames();assert(!h.attributes.has(key));assert(transition.isConnected);
  select(app,"blue-pink-neon");assert(h.frames.size);app.dispose();assert.equal(h.styles.size,0);assert.equal(h.frames.size,0);assert.equal(h.attributes.size,0);
});
