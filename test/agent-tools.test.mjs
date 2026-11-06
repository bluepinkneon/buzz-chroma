import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {AGENT_PROCESS_ID, MAX_FADE_MS, POLARITY_CUT_MS, agentMcpHandler, createAgentTools, ownAgentControls, polarityGate, polarityOf} from "../agent-tools.js";
import {createRoleEngine} from "../role-engine.js";
import {mapRoles} from "../role-map.js";
import {PRESETS} from "../presets.js";

const NAMES = ["chroma_get_look", "chroma_set_look", "chroma_save_preset", "chroma_list_presets"];
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

test("four stable, Buzz-valid tools whose listing is pinned", () => {
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
  assert.equal(Object.keys(tools).length, 4, "dispose is not listed as a tool");
  // Changing a name, description or schema gives every Buzz-run Codex agent a
  // fresh thread. Update this only on purpose.
  assert.equal(addedKey(tools), "3o9o7");
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
  assert.deepEqual(api.calls.at(-1), ["listPresets", {includeSaved: true}]);
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

test("the MCP handler answers the helper's handshake, lists and calls the same tools", async () => {
  const api = fakeApi(), tools = createAgentTools(api), mcp = agentMcpHandler(tools);
  const request = (method, params, id = 1) => mcp({jsonrpc: "2.0", id, method, ...(params === undefined ? {} : {params})});
  // buzz-agent-command --launch sends exactly this (agent-command main.rs:156).
  const init = await request("initialize", {protocolVersion: "2025-06-18", capabilities: {}, clientInfo: {name: "buzz-agent-command", version: "1"}});
  assert.deepEqual(init.result, {protocolVersion: "2025-06-18", capabilities: {tools: {listChanged: false}}, serverInfo: {name: "chroma", version: "1"}});
  assert.equal((await request("initialize", {protocolVersion: "2099-01-01"})).result.protocolVersion, "2025-06-18");
  assert.equal((await request("initialize", {protocolVersion: "2025-03-26"})).result.protocolVersion, "2025-03-26");
  assert.equal(await mcp({jsonrpc: "2.0", method: "notifications/initialized", params: {}}), undefined);
  assert.equal(await mcp({jsonrpc: "2.0", method: "notifications/cancelled", params: {requestId: 1}}), undefined);
  assert.equal(await mcp({jsonrpc: "2.0", id: 9, result: {}}), undefined);
  assert.deepEqual((await request("ping", undefined, "p")), {jsonrpc: "2.0", id: "p", result: {}});
  const listed = (await request("tools/list", {})).result.tools;
  assert.deepEqual(listed, tools.map(({name, description, inputSchema}) => ({name, description, inputSchema})));
  const called = await request("tools/call", {name: "chroma_set_look", arguments: {preset: "spider-man", fadeMs: 1200}}, 7);
  assert.equal(called.id, 7);
  assert.equal(called.result.isError, undefined);
  assert.equal(JSON.parse(called.result.content[0].text).look.preset, "spider-man");
  const toolError = (await request("tools/call", {name: "chroma_set_look", arguments: {bogus: true}})).result;
  assert.equal(toolError.isError, true);
  assert.equal(JSON.parse(toolError.content[0].text).error, "invalid-arguments");
  assert.equal((await request("tools/call", {name: "chroma_get_look"})).result.isError, undefined, "arguments may be omitted");
  assert.equal((await request("tools/call", {name: "nope"})).error.code, -32602);
  assert.equal((await request("resources/list", {})).error.code, -32601);
  assert.equal((await request("tools/list", [])).error.code, -32602);
  assert.deepEqual(await mcp([{jsonrpc: "2.0", id: 1, method: "ping"}]), {jsonrpc: "2.0", id: null, error: {code: -32600, message: "Invalid Request"}});
  assert.equal((await mcp({id: 1, method: "ping"})).error.code, -32600);
  assert.equal((await mcp({jsonrpc: "2.0", id: {}, method: "ping"})).error.code, -32600);
  tools.dispose();
  assert.equal(JSON.parse((await request("tools/call", {name: "chroma_get_look", arguments: {}})).result.content[0].text).error, "off");
});

// Cordis-like scopes over Buzz's agents and host services.
function fakeBuzz({agents = true, host = true, helperExit = 0, afterServe = () => {}} = {}) {
  const registry = new Map(), fibers = [], servers = [], spawns = [], cleanups = [];
  const bind = scope => ({
    agents: agents && {addTool(tool) {
      if (scope.disposing) throw new Error("inactive scope");
      if (registry.has(tool.name)) throw new Error(`Another plugin adds agent tool ${tool.name}`);
      registry.set(tool.name, tool);
      scope.effects.push(() => registry.delete(tool.name));
    }},
    host: host && {
      async serveMcp(handler) {
        await tick();
        let stop;
        const record = {handler, open: true, closed: new Promise(resolve => { stop = resolve; })};
        const close = async () => { if (record.open) { record.open = false; stop(); } };
        record.server = Object.freeze({url: "http://127.0.0.1:49152/mcp", headers: Object.freeze([Object.freeze({name: "Authorization", value: "Bearer SECRET-TOKEN"})]), close, closed: record.closed});
        servers.push(record);
        // Like Buzz: a server whose scope already ended is closed and refused.
        if (scope.disposing) { await close(); throw new Error("inactive scope"); }
        scope.effects.push(close);
        afterServe();
        return record.server;
      },
      async spawn(id, options) {
        await tick();
        let exit;
        const exited = new Promise(resolve => { exit = resolve; });
        const record = {id, options, killed: false, exit};
        spawns.push(record);
        scope.effects.push(() => { record.killed = true; exit(null); });
        if (helperExit !== "hang") setImmediate(() => exit(helperExit));
        return {exited, kill: async () => exit(null), write: async () => {}, end: async () => {}};
      },
    },
  });
  const ctx = {
    reflect: {get: name => ({agents: agents ? {addTool() {}} : undefined, host: host ? {serveMcp() {}, spawn() {}} : undefined})[name]},
    effect(fn) { cleanups.push(fn()); },
    plugin({name, inject, apply}) {
      const scope = {effects: [], disposing: false};
      Object.assign(scope, bind(scope));
      const fiber = {name, inject, scope, disposals: 0, dispose() {
        fiber.disposals++;
        if (fiber.ended) return fiber.ended;
        scope.disposing = true;
        fiber.ended = (async () => { await tick(); await tick(); for (const effect of scope.effects.reverse()) await effect(); })();
        return fiber.ended;
      }};
      // Cordis applies in a later task; a failing apply fails only this fiber.
      queueMicrotask(() => { if (!scope.disposing) try { apply(scope); } catch (error) { fiber.error = error; } });
      fibers.push(fiber);
      return fiber;
    },
  };
  return {ctx, registry, fibers, servers, spawns, unload: () => cleanups.forEach(cleanup => cleanup?.())};
}

test("agent controls start off and report what this Buzz can offer", async () => {
  const buzz = fakeBuzz(), events = [];
  const controls = ownAgentControls(buzz.ctx, fakeApi(), state => events.push(state));
  assert.deepEqual(controls.get(), {native: false, external: false});
  assert.deepEqual(controls.getState(), {capabilities: {native: true, external: true}, native: {enabled: false, status: "off"}, external: {enabled: false, status: "off"}});
  assert.equal(buzz.fibers.length, 0, "nothing is offered until turned on");
  const bare = ownAgentControls(fakeBuzz({agents: false, host: false}).ctx, fakeApi());
  assert.deepEqual(bare.getState().capabilities, {native: false, external: false});
  assert.equal(bare.getState().native.status, "unavailable");
  await assert.rejects(bare.set({native: true}), /cannot offer native/);
  await assert.rejects(controls.set({native: "yes"}), TypeError);
  await assert.rejects(controls.set({other: true}), TypeError);
  assert.deepEqual(events, []);
});

test("native tools live in a child scope that is fully released before they return", async () => {
  const buzz = fakeBuzz(), api = fakeApi(), events = [];
  const controls = ownAgentControls(buzz.ctx, api, state => events.push(state.native.status));
  const state = await controls.set({native: true});
  assert.equal(state.native.status, "on");
  assert.deepEqual(buzz.fibers[0].inject, ["agents"]);
  assert.deepEqual([...buzz.registry.keys()], NAMES);
  await buzz.registry.get("chroma_set_look").call({}, {}, {preset: "spider-man"});
  assert.equal(api.getLook().preset, "spider-man");
  // Rapid toggles end in one registration, never "Another plugin adds".
  const toggles = [controls.set({native: false}), controls.set({native: true}), controls.set({native: false}), controls.set({native: true})];
  await Promise.all(toggles);
  await settle();
  assert.equal(controls.getState().native.status, "on");
  assert.deepEqual([...buzz.registry.keys()], NAMES);
  assert(buzz.fibers.every(fiber => fiber.error === undefined));
  assert.deepEqual(api.stack, [], "turning off released the agent's look");
  const stale = buzz.fibers[0].scope;
  assert(stale.disposing);
  await controls.set({native: false});
  assert.deepEqual([...buzz.registry.keys()], []);
  assert.equal(controls.getState().native.status, "off");
  assert.deepEqual(events.slice(0, 2), ["starting", "on"]);
});

test("a failed native registration is reported and cleaned up", async () => {
  const buzz = fakeBuzz();
  buzz.registry.set("chroma_save_preset", {});
  const controls = ownAgentControls(buzz.ctx, fakeApi());
  const state = await controls.set({native: true});
  assert.deepEqual(state.native, {enabled: false, status: "error", error: "Another plugin adds agent tool chroma_save_preset"});
  await settle();
  assert.deepEqual([...buzz.registry.keys()], ["chroma_save_preset"], "the tools it had added are removed");
  assert.equal(buzz.fibers[0].disposals, 1);
});

test("external agents get one server, one helper spawn, and no token from us", async () => {
  const buzz = fakeBuzz(), api = fakeApi(), seen = [];
  const original = {log: console.log, warn: console.warn, error: console.error, info: console.info, debug: console.debug};
  for (const name of Object.keys(original)) console[name] = (...args) => seen.push(args);
  try {
    const controls = ownAgentControls(buzz.ctx, api, state => seen.push(state));
    const state = await controls.set({external: true});
    assert.equal(state.external.status, "on");
    assert.deepEqual(buzz.fibers[0].inject, ["host"]);
    assert.equal(buzz.servers.length, 1);
    assert.deepEqual(buzz.spawns.map(spawn => spawn.id), [AGENT_PROCESS_ID]);
    assert.equal(buzz.spawns[0].options.mcp, buzz.servers[0].server, "the server goes to the helper as Buzz returned it");
    assert.deepEqual(Object.keys(buzz.spawns[0].options), ["mcp"]);
    const {handler} = buzz.servers[0];
    assert.equal((await handler({jsonrpc: "2.0", id: 1, method: "initialize", params: {protocolVersion: "2025-06-18"}})).result.serverInfo.name, "chroma");
    await handler({jsonrpc: "2.0", id: 2, method: "tools/call", params: {name: "chroma_set_look", arguments: {preset: "batman"}}});
    assert.equal(api.getLook().preset, "batman");
    await controls.set({external: false});
    assert.equal(buzz.servers[0].open, false, "turning off closes the server");
    assert.deepEqual(api.stack, []);
    await controls.set({external: true});
    assert.equal(buzz.servers.length, 2);
    assert.equal(buzz.spawns.length, 2, "one spawn per server");
    await controls.dispose();
    assert(buzz.servers.every(server => !server.open));
    await assert.rejects(controls.set({external: true}), /disposed/);
  } finally { Object.assign(console, original); }
  await settle();
  assert(!JSON.stringify(seen).includes("SECRET-TOKEN"));
});

test("a helper failure or a stopped server turns external agents off with the reason", async () => {
  const failing = fakeBuzz({helperExit: 1});
  const controls = ownAgentControls(failing.ctx, fakeApi());
  assert.deepEqual((await controls.set({external: true})).external, {enabled: false, status: "error", error: "Buzz's agent helper could not offer the tools (exit 1)."});
  await settle();
  assert.equal(failing.servers[0].open, false);

  const buzz = fakeBuzz(), api = fakeApi(), events = [];
  const live = ownAgentControls(buzz.ctx, api, state => events.push(state.external.status));
  await live.set({native: true, external: true});
  await buzz.registry.get("chroma_set_look").call({}, {}, {preset: "spider-man"});
  await buzz.servers[0].handler({jsonrpc: "2.0", id: 1, method: "tools/call", params: {name: "chroma_set_look", arguments: {preset: "batman"}}});
  // A second initialize, a reload or Buzz itself can stop the server.
  await buzz.servers[0].server.close();
  await settle();
  assert.deepEqual(live.getState().external, {enabled: false, status: "error", error: "The agent server stopped. Turn external agents off and on to offer the tools again."});
  assert.deepEqual(api.stack.map(entry => entry.look.preset), ["spider-man"], "the native look is untouched");
  assert.equal(live.getState().native.status, "on");
  assert.equal(events.at(-1), "error");
  await live.set({external: true});
  assert.equal(live.getState().external.status, "on");
  await live.dispose();
});

test("turning external off while it starts never leaves a server or helper running", async () => {
  const buzz = fakeBuzz({helperExit: "hang"});
  const controls = ownAgentControls(buzz.ctx, fakeApi());
  const starting = controls.set({external: true});
  await settle(4);
  assert.equal(controls.getState().external.status, "starting");
  await controls.set({external: false});
  await starting;
  await settle();
  assert.equal(controls.getState().external.status, "off");
  assert(buzz.servers.every(server => !server.open));
  assert(buzz.spawns.every(spawn => spawn.killed));
});

test("native and external agents share one dark/light flip limit", async () => {
  const buzz = fakeBuzz(), api = fakeApi();
  const controls = ownAgentControls(buzz.ctx, api);
  await controls.set({native: true, external: true});
  await buzz.registry.get("chroma_set_look").call({}, {}, {appearance: "light"});
  const reply = await buzz.servers[0].handler({jsonrpc: "2.0", id: 1, method: "tools/call", params: {name: "chroma_set_look", arguments: {appearance: "dark"}}});
  assert.equal(reply.result.isError, true);
  assert.equal(JSON.parse(reply.result.content[0].text).error, "appearance-rate-limited");
  assert.equal(api.getLook().resolvedAppearance, "light");
  await controls.dispose();
});

test("a server stopped before the helper starts is never advertised", async () => {
  let controls;
  const buzz = fakeBuzz({afterServe: () => void controls.set({external: false})});
  controls = ownAgentControls(buzz.ctx, fakeApi());
  await controls.set({external: true});
  await settle();
  assert.equal(buzz.servers.length, 1);
  assert.equal(buzz.spawns.length, 0);
  assert.equal(buzz.servers[0].open, false);
  assert.equal(controls.getState().external.status, "off");
});

test("plugin unload turns both transports off", async () => {
  const buzz = fakeBuzz(), api = fakeApi();
  const controls = ownAgentControls(buzz.ctx, api);
  await controls.set({native: true, external: true});
  await buzz.registry.get("chroma_set_look").call({}, {}, {preset: "spider-man"});
  buzz.unload();
  await settle();
  assert.deepEqual(controls.get(), {native: false, external: false});
  assert.deepEqual([...buzz.registry.keys()], []);
  assert(buzz.servers.every(server => !server.open));
  assert.deepEqual(api.stack, []);
});
