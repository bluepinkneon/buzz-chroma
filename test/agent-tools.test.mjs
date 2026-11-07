import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MAX_FADE_MS, POLARITY_CUT_MS, createAgentTools, ownAgentControls, polarityGate, polarityOf} from "../agent-tools.js";
import {createRoleEngine} from "../role-engine.js";
import {mapRoles} from "../role-map.js";
import {PRESETS} from "../presets.js";

const NAMES = ["chroma_get_look", "chroma_set_look", "chroma_save_preset", "chroma_list_presets", "chroma_play"];
const tick = () => new Promise(resolve => setImmediate(resolve));
const settle = async (turns = 12) => { for (let i = 0; i < turns; i++) await tick(); };
const parsed = async promise => JSON.parse(await promise);
const failure = async promise => { try { await promise; } catch (error) { return JSON.parse(error.message); } assert.fail("expected a tool error"); };

// The public Chroma API as the runtime provides it: overrides stack, the top one shows.
function fakeApi({theme = "bluepinkneon"} = {}) {
  const user = {theme, preset: "blue-pink-neon", appearance: "dark", hues: [224, 359, 179]};
  const stack = [], calls = [];
  const defaults = {superman: "light", batman: "dark", "spider-man": "dark"};
  const polarity = look => look.appearance === "light" ? "light" : "dark";
  const choose = options => {
    // A complete getLook() snapshot restores exactly; metadata is read-only.
    if (Object.hasOwn(options, "theme") && Object.hasOwn(options, "hues")) { const {fadeMs, resolvedAppearance, ...look} = options; return structuredClone(look); }
    if (Object.keys(options).some(key => !["preset", "colors", "rotation", "appearance", "mode", "monochrome", "surfaceOffset", "neutralGround", "fadeMs"].includes(key))) throw new TypeError("Unknown theme option");
    if (options.preset !== undefined && !Object.hasOwn(defaults, options.preset) && !options.preset.startsWith("local:")) throw new TypeError("Unknown preset");
    const look = {...user, theme: "bluepinkneon"};
    if (options.preset) Object.assign(look, {preset: options.preset, appearance: defaults[options.preset] ?? look.appearance});
    if (options.colors) look.preset = "custom";
    for (const key of ["appearance", "mode", "rotation"]) if (options[key] !== undefined) look[key] = options[key];
    return look;
  };
  return {
    calls, stack, user,
    getLook: () => { const look = stack.at(-1)?.look ?? user; return structuredClone({...look, resolvedAppearance: polarity(look)}); },
    generateTheme(options) {
      calls.push(["generateTheme", options]);
      const look = Object.hasOwn(options, "resolvedAppearance") ? options : choose(options);
      return {"--bg-app": polarity(look) === "dark" ? "#14161c" : "#f6f7f9", "--text-standard": polarity(look) === "dark" ? "#eef0f6" : "#16181d"};
    },
    setLook(options) {
      calls.push(["setLook", options]);
      const entry = {look: choose(options), options, disposed: 0};
      stack.push(entry);
      const handle = () => handle.dispose();
      handle.dispose = () => { entry.disposed++; const index = stack.indexOf(entry); if (index >= 0) stack.splice(index, 1); };
      handle.entry = entry;
      return handle;
    },
    savePreset(name, look) { calls.push(["savePreset", name, look]); return {id: `local:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, persisted: true}; },
    listPresets(options) { calls.push(["listPresets", options]); return [{id: "spider-man", label: "Spider-Man"}, ...(options?.includeSaved ? [{id: "local:xmas", label: "xmas"}] : [])]; },
    userEdits() { stack.length = 0; },
  };
}
const setCalls = api => api.calls.filter(([name]) => name === "setLook").length;

// Buzz's addedKey: what decides when a Codex agent's thread is replaced.
function addedKey(tools) {
  const text = JSON.stringify(tools.map(({name, description, inputSchema}) => ({name, description, inputSchema})).sort((a, b) => (a.name < b.name ? -1 : 1)));
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}

test("five stable, Buzz-valid tools whose listing is pinned", () => {
  const tools = createAgentTools(fakeApi());
  assert.deepEqual(tools.map(tool => tool.name), NAMES);
  for (const tool of tools) {
    // ctx.agents.addTool's own refusal rules (service.ts:2129).
    assert.match(tool.name, /^[a-z][a-z0-9_]{0,63}$/);
    assert(tool.description && tool.inputSchema.type === "object" && typeof tool.call === "function");
    assert.deepEqual(JSON.parse(JSON.stringify(tool.inputSchema)), tool.inputSchema);
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert(Object.isFrozen(tool) && Object.isFrozen(tool.inputSchema));
  }
  assert.equal(Object.keys(tools).length, 5, "dispose is not listed as a tool");
  // Changing a name, description or schema gives every Buzz-run Codex agent a
  // fresh thread. Update this only on purpose.
  assert.equal(addedKey(tools), "yicl9r");
  tools.dispose();
});

test("arguments are validated strictly before the API is touched", async () => {
  const api = fakeApi(), [, set, save] = createAgentTools(api);
  const refused = [
    [set, {unknown: 1}], [set, {preset: "Spider Man"}], [set, {colors: []}], [set, {colors: ["#fff"]}],
    [set, {colors: ["#000000", "#111111", "#222222", "#333333"]}], [set, {rotation: Number.NaN}], [set, {rotation: Infinity}],
    [set, {appearance: "dim"}], [set, {mode: "invalid"}], [set, {surfaceOffset: 45}], [set, {neutralGround: "yes"}],
    [set, {fadeMs: 999}], [set, {fadeMs: -1}], [set, {fadeMs: MAX_FADE_MS + 1}], [set, {fadeMs: 1.5}], [set, []], [set, null], [set, "x"],
    [set, {preset: "x".repeat(9000)}], [save, {name:"friendly name",look:{}}], [save, {name:"valid-but-missing-look"}], [save, {}], [save, {name: ""}], [save, {name: "a\nb"}], [save, {name: "x".repeat(61)}],
    [set, {look: {theme: "bluepinkneon", hues: [1, 2, 3]}, preset: "batman"}], [set, {look: "x"}],
    [save, {name: "ok", look: []}], [save, {name: "ok", extra: true}], [save, {name: "ok", look: {blob: "x".repeat(9000)}}],
  ];
  for (const [tool, args] of refused) assert.equal((await failure(tool.call(undefined, undefined, args))).error, "invalid-arguments", JSON.stringify(args)?.slice(0, 80));
  assert.deepEqual(api.calls, []);
});

test("set_look replaces its one handle only after the new look is valid", async () => {
  const api = fakeApi(), tools = createAgentTools(api), set = tools[1];
  const first = await parsed(set.call(undefined, undefined, {preset: "spider-man", fadeMs: 1400}));
  assert.equal(first.look.preset, "spider-man");
  assert.deepEqual(api.calls.find(([name]) => name === "generateTheme")[1], {preset: "spider-man"}, "fadeMs never reaches generation");
  assert.deepEqual(api.stack.at(-1).options, {preset: "spider-man", fadeMs: 1400});
  const live = api.stack.at(-1);
  // Refused by the runtime: the earlier look stays live and untouched.
  assert.equal((await failure(set.call(undefined, undefined, {preset: "local-nope"}))).error, "rejected");
  assert.deepEqual(api.stack, [live]);
  assert.equal(live.disposed, 0);
  await set.call(undefined, undefined, {colors: ["#c8102e", "#00873e", "#d4af37"], mode: "color", fadeMs: 1500});
  assert.equal(api.stack.length, 1, "the old handle was released after the new one");
  assert.equal(live.disposed, 1);
  assert.equal(api.stack[0].look.preset, "custom");
  // Omitting every look field returns to the owner's look.
  await set.call(undefined, undefined, {fadeMs: 1800});
  assert.equal(api.getLook().preset, "blue-pink-neon");
  tools.dispose();
  assert.deepEqual(api.stack, []);
  assert.equal((await failure(set.call(undefined, undefined, {preset: "batman"}))).error, "off");
  tools.dispose();
});

test("a brief cue restores the exact earlier look, snapshot unstripped", async () => {
  const api = fakeApi(), [get, set] = createAgentTools(api);
  await set.call(undefined, undefined, {preset: "spider-man", rotation: 12});
  const before = await parsed(get.call(undefined, undefined, {}));
  await set.call(undefined, undefined, {colors: ["#d0021b", "#d0021b", "#d0021b"], mode: "color"});
  assert.equal(api.getLook().preset, "custom");
  api.calls.length = 0;
  await set.call(undefined, undefined, {look: before.look, fadeMs: 1600});
  assert.deepEqual(api.calls.find(([name]) => name === "generateTheme")[1], before.look, "the whole snapshot is checked for dark/light");
  assert.deepEqual(api.calls.find(([name]) => name === "setLook")[1], {...before.look, fadeMs: 1600});
  assert.deepEqual(api.getLook(), before.look);
  await set.call(undefined, undefined, {look: before.look});
  assert.deepEqual(api.calls.filter(([name]) => name === "setLook").at(-1)[1], before.look);
});

test("the owner's edits win, and each toolset releases only its own look", async () => {
  const api = fakeApi(), a = createAgentTools(api), b = createAgentTools(api);
  await a[1].call(undefined, undefined, {preset: "spider-man"});
  await b[1].call(undefined, undefined, {preset: "batman"});
  a.dispose();
  assert.deepEqual(api.stack.map(entry => entry.look.preset), ["batman"]);
  api.userEdits();
  assert.equal((await parsed(b[0].call(undefined, undefined, {}))).look.preset, "blue-pink-neon");
  await b[1].call(undefined, undefined, {preset: "spider-man"});
  assert.equal(api.getLook().preset, "spider-man", "a later agent call may set a look again");
  b.dispose();
  assert.deepEqual(api.stack, []);
});

test("dark/light cuts are limited to one per second, shared by every toolset", async () => {
  let now = 5000;
  const api = fakeApi(), gate = polarityGate(() => now);
  const a = createAgentTools(api, {gate}), b = createAgentTools(api, {gate});
  await a[1].call(undefined, undefined, {appearance: "light"});
  now += 400;
  const refused = await failure(b[1].call(undefined, undefined, {appearance: "dark", fadeMs: 0}));
  assert.deepEqual(refused, {error: "appearance-rate-limited", message: "Dark/light can change at most once a second.", retryAfterMs: POLARITY_CUT_MS - 400});
  assert.equal(setCalls(api), 1, "a refused cut never reaches setLook");
  // A preset whose own appearance flips counts too; hue changes do not.
  assert.equal((await failure(a[1].call(undefined, undefined, {preset: "batman"}))).error, "appearance-rate-limited");
  // Unnamed fields come from the owner's dark look, so this would flip too.
  assert.equal((await failure(a[1].call(undefined, undefined, {colors: ["#ff0000", "#00ff00", "#0000ff"]}))).error, "appearance-rate-limited");
  await a[1].call(undefined, undefined, {colors: ["#ff0000", "#00ff00", "#0000ff"], appearance: "light"});
  await a[1].call(undefined, undefined, {preset: "superman"});
  now += POLARITY_CUT_MS - 400;
  await b[1].call(undefined, undefined, {appearance: "dark"});
  assert.equal(api.getLook().resolvedAppearance, "dark");
  now += 999;
  assert.equal((await failure(a[1].call(undefined, undefined, {appearance: "light"}))).retryAfterMs, 1);
  a.dispose(); b.dispose();
});

test("get, save and list return JSON content", async () => {
  const api = fakeApi(), [get, set, save, list] = createAgentTools(api);
  const got = await parsed(get.call(undefined, undefined, {}));
  assert.equal(got.look.preset, "blue-pink-neon");
  assert.equal(got.palette["--bg-app"], "#14161c");
  await set.call(undefined, undefined, {preset: "spider-man"});
  assert.deepEqual(await parsed(save.call(undefined, undefined, {name: "christmas-cheer", look: api.getLook()})), {id: "local:christmas-cheer", persisted: true});
  assert.equal(api.calls.at(-1)[2].preset, "spider-man", "explicit snapshot is passed intact");
  await save.call(undefined, undefined, {name: "given", look: {preset: "batman"}});
  assert.deepEqual(api.calls.at(-1), ["savePreset", "given", {preset: "batman"}]);
  assert.deepEqual((await parsed(list.call(undefined, undefined, {}))).presets.map(preset => preset.id), ["spider-man", "local:xmas"]);
  assert.deepEqual(api.calls.at(-1), ["listPresets", {includeSaved: true,includeAnimated:true}]);
  // Buzz's own look is showing: no generated palette is claimed.
  assert.deepEqual(Object.keys(await parsed(createAgentTools(fakeApi({theme: "default"}))[0].call(undefined, undefined, {}))), ["look"]);
});

test("the dark/light reading matches the real engine for every mode and hue", () => {
  const original = Object.fromEntries([...readFileSync(new URL("../shepherd-theme.css", import.meta.url), "utf8").matchAll(/(--[\w-]+):\s*(#[\da-f]{6});/gi)].map(m => [m[1], m[2]]));
  const engine = createRoleEngine(original);
  let checked = 0;
  const expect = (options) => { assert.equal(polarityOf(mapRoles(engine.generate(options))), options.appearance, JSON.stringify(options)); checked++; };
  for (const appearance of ["dark", "light"]) {
    for (let h = 0; h < 360; h += 30) for (const neutralGround of [false, true]) {
      expect({appearance, mode: "color", hues: [h, (h + 135) % 360, (h + 315) % 360], neutralGround});
      expect({appearance, mode: "duo", hues: [h, (h + 135) % 360, 0], neutralGround});
      expect({appearance, mode: "mono", monoHue: h, neutralGround});
    }
    expect({appearance, mode: "mono", neutral: true});
    for (const preset of PRESETS) expect({appearance, mode: preset.defaultMode, hues: preset.hues, neutrals: preset.neutrals, surfaceOffset: preset.surfaceOffset, neutralGround: preset.neutralGround, monoHue: preset.hues[0], neutral: preset.neutrals[0]});
  }
  assert(checked > 150);
  assert.throws(() => polarityOf({}), /no --bg-app/);
});

// Cordis-like scopes over Buzz's built-in registry.
function fakeBuzz({agents=true,pending=false}={}) {
  const registry=new Map(),fibers=[],cleanups=[];
  const ctx={reflect:{get(name){assert.equal(name,"agents");return agents?{addTool(){}}:undefined;}},
    effect(fn){cleanups.push(fn());},
    plugin({name,inject,apply}) {
      const scope={effects:[],disposing:false};
      scope.agents={addTool(tool){if(scope.disposing)throw Error("inactive scope");if(registry.has(tool.name))throw Error(`Another plugin adds agent tool ${tool.name}`);registry.set(tool.name,tool);scope.effects.push(()=>registry.delete(tool.name));}};
      const fiber={name,inject,scope,disposals:0,dispose(){fiber.disposals++;if(fiber.ended)return fiber.ended;scope.disposing=true;return fiber.ended=(async()=>{await tick();await tick();for(const effect of scope.effects.reverse())await effect();})();}};
      fiber.apply=()=>{if(scope.disposing)return;try{apply(scope);}catch(error){fiber.error=error;}};
      fibers.push(fiber);if(!pending)fiber.apply();return fiber;
    }};
  return{ctx,registry,fibers,unload:()=>cleanups.forEach(fn=>fn?.())};
}

test("one agent control reports availability and accepts only a boolean",async()=>{
  const buzz=fakeBuzz(),controls=ownAgentControls(buzz.ctx,fakeApi());
  assert.equal(controls.get(),false);assert.deepEqual(controls.getState(),{available:true,enabled:false,status:"off"});assert.equal(buzz.fibers.length,0);
  const unavailable=ownAgentControls(fakeBuzz({agents:false}).ctx,fakeApi());assert.equal(unavailable.getState().status,"unavailable");await assert.rejects(unavailable.set(true),/cannot offer/);
  for(const value of ["yes",1,{},null])await assert.rejects(controls.set(value),TypeError);
});

test("tools live in one child scope and asynchronous disposal completes before re-registration",async()=>{
  const buzz=fakeBuzz(),api=fakeApi(),events=[],controls=ownAgentControls(buzz.ctx,api,state=>events.push(state.status));
  assert.equal((await controls.set(true)).status,"on");assert.deepEqual(buzz.fibers[0].inject,["agents"]);assert.deepEqual([...buzz.registry.keys()],NAMES);
  await buzz.registry.get("chroma_set_look").call({}, {},{preset:"spider-man"});assert.equal(api.getLook().preset,"spider-man");
  await Promise.all([controls.set(false),controls.set(true),controls.set(false),controls.set(true)]);await settle();
  assert.equal(controls.getState().status,"on");assert.deepEqual([...buzz.registry.keys()],NAMES);assert(buzz.fibers.every(f=>!f.error));assert.deepEqual(api.stack,[]);
  const stale=buzz.registry.get("chroma_get_look");await controls.set(false);assert.equal(buzz.registry.size,0);await assert.rejects(stale.call({}, {},{}),/off/);assert.deepEqual(events.slice(0,2),["starting","on"]);
});

test("failed registration reports the error and releases partially registered tools",async()=>{
  const buzz=fakeBuzz();buzz.registry.set("chroma_save_preset",{});const controls=ownAgentControls(buzz.ctx,fakeApi());
  assert.deepEqual(await controls.set(true),{available:true,enabled:false,status:"error",error:"Another plugin adds agent tool chroma_save_preset"});
  await settle();assert.deepEqual([...buzz.registry.keys()],["chroma_save_preset"]);assert.equal(buzz.fibers[0].disposals,1);
});

test("unload during registration cannot revive tools, and unload releases a temporary look",async()=>{
  const delayed=fakeBuzz({pending:true}),waiting=ownAgentControls(delayed.ctx,fakeApi()),start=waiting.set(true);await settle();await waiting.dispose();await start;delayed.fibers[0].apply();assert.equal(delayed.registry.size,0);await assert.rejects(waiting.set(true),/disposed/);
  const buzz=fakeBuzz(),api=fakeApi(),controls=ownAgentControls(buzz.ctx,api);await controls.set(true);await buzz.registry.get("chroma_set_look").call({}, {},{preset:"spider-man"});buzz.unload();await settle();assert.equal(controls.get(),false);assert.equal(buzz.registry.size,0);assert.deepEqual(api.stack,[]);
});
