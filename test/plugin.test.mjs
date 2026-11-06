import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {createHash} from "node:crypto";
import * as plugin from "../dist/plugin.js";

import {host,find,input,rotate,click,select,variables} from "./host.mjs";

test("default theme preserves every original color without importing layout tokens", () => {
  const h = host(); const app = h.boot();
  const original = variables(readFileSync(new URL("../shepherd-theme.css", import.meta.url), "utf8"));
  assert.equal(original.size, 152);
  assert.deepEqual(variables(h.css()), original);
  // Full visible CSS parity with the published v1.1.0 default, not just raw tokens.
  assert.equal(createHash("sha256").update(h.css()).digest("hex"),"bd567296ed79c12b506f7cf69203cd1a64d81c7d9bf5827e2abe49591aac14c7");
  assert(!h.css().includes("--space-1:"));
  assert.deepEqual(Object.keys(plugin).sort(), ["apply", "inject"]);
  app.dispose();
});

test("all three hue controls, rotation wrapping, and reset affect the active theme", () => {
  const h = host(); const app = h.boot(); const original = h.css();
  for (const name of ["Primary", "Secondary", "Text"]) {
    click(app, "Reset blue-pink-neon");
    input(app, name).props.onChange({ target: { value: "#ff7b00" } });
    assert.notEqual(h.css(), original, name);
  }
  rotate(app, 359); click(app, "Rotate +45°");
  assert.equal(JSON.parse([...h.saved.values()][0]).rotation, 44);
  click(app, "Reset blue-pink-neon"); assert.equal(h.css(), original);
  app.dispose();
});

test("choices survive reactivation, and default/disable remove all owned styles", () => {
  const h = host(); let app = h.boot(); rotate(app, 120); const rotated = h.css();
  app.dispose(); assert.equal(h.styles.size, 0); assert.equal(h.attributes.size, 0);
  app = h.boot(); assert.equal(h.css(), rotated);
  select(app, "default"); assert.equal(h.styles.size, 0); assert.equal(h.attributes.size, 0);
  app.dispose(); app = h.boot(); assert.equal(h.styles.size, 0); app.dispose();
});

test("malformed saved data falls back and storage failures remain visible", () => {
  for (const saved of ["{", "null", JSON.stringify({ theme: "bluepinkneon", hues: [null, 2, 3], rotation: 0 }), JSON.stringify({ theme: "bluepinkneon", hues: [1, 2, 3], rotation: 999 })]) {
    const h = host(new Map([["com.ranveer.bluepinkneon:theme:v2", saved]])); const app = h.boot();
    assert.equal(variables(h.css()).get("--palette-primary-7"), "#0099dd"); app.dispose();
  }
  const h = host(); globalThis.localStorage = { getItem() { throw Error("denied"); }, setItem() { throw Error("denied"); } };
  const app = h.boot(); assert(JSON.stringify(app.tree()).includes("Could not read"));
  click(app, "Rotate +45°"); assert(JSON.stringify(app.tree()).includes("could not save")); app.dispose();
});

test("body text exceeds 7:1 WCAG contrast on the two main surfaces at 24 rotated anchors", () => {
  function luminance(hex) {
    const rgb = hex.slice(1).match(/../g).map((x) => parseInt(x, 16) / 255).map((x) => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  }
  const h = host(); const app = h.boot();
  for (let rotation = 0; rotation < 360; rotation += 15) {
    rotate(app, rotation); const v = variables(h.css());
    for (const background of ["--token-bg", "--token-bg-subtle"]) {
      assert((luminance(v.get("--token-fg")) + .05) / (luminance(v.get(background)) + .05) > 7, `${rotation}° ${background}`);
    }
  }
  app.dispose();
});
