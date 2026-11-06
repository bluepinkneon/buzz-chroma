import test from "node:test";
import assert from "node:assert/strict";
import {host,click} from "./host.mjs";

test("live updates replace one temporary look and dispose returns directly to the saved theme",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma"),original=h.css();
  const look=api.setLook({preset:"john-wick"});
  for(let angle=0;angle<360;angle+=2)look.update({rotation:angle});
  assert.equal(api.getLook().rotation,358);assert.equal(h.saved.size,0);
  look.update({appearance:"light",mode:"monochrome",monochrome:"#cc2233"});
  assert(h.css().includes("color-scheme:light"));
  look.dispose();assert.equal(h.css(),original);
  assert.throws(()=>look.update({rotation:0}));look();app.dispose();
});

test("an older stream updates its own state without taking priority from a newer stream",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  const a=api.setLook({preset:"daredevil"}),middle=api.setLook({preset:"spider-man"}),b=api.setLook({preset:"john-wick"});
  const top=h.css();a.update({rotation:37});assert.equal(h.css(),top);
  middle.dispose();assert.equal(h.css(),top);b.dispose();assert.equal(api.getLook().rotation,37);
  for(const patch of [{rotation:NaN},{colors:Array(3)},{surfaceOffset:45},{preset:"missing"}]) {
    const before=h.css();assert.throws(()=>a.update(patch));assert.equal(h.css(),before);
  }
  click(app,"Light");assert.throws(()=>a.update({rotation:2}),"manual ownership cannot be revived");
  app.dispose();assert.throws(()=>a.update({rotation:3}));
});
