// Chroma's four agent tools, served to Buzz-run agent sessions (ctx.agents.addTool)
// and to the user's other local agents (an advertised loopback MCP server).
// Both transports run the same validated handlers; Buzz owns HTTP, its token and
// the MCP session. Contracts pinned to Buzz desktop-v0.7.9 (8ad11326).

export const AGENT_PROCESS_ID = "agent-access";
export const POLARITY_CUT_MS = 1000;
export const MAX_FADE_MS = 300000;
const MAX_ARGUMENT_BYTES = 8192;
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const HEX = "^#[0-9A-Fa-f]{6}$";

const frozen = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
};
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

// Names, descriptions and schemas are part of every agent session's tool list.
// Buzz gives each Codex agent a fresh thread when any of them changes.
const SCHEMAS = frozen({
  chroma_get_look: {
    description: "Read the user's current look from the Colors plugin in Buzz: to describe it, build on it, or keep it so chroma_set_look can restore it exactly after a brief cue. Returns look and, while the Colors plugin paints Buzz, palette: every generated semantic color role.",
    inputSchema: {type: "object", properties: {}, additionalProperties: false},
  },
  chroma_set_look: {
    description: "Express a mood or moment through the user\u2019s colors\u2014for example a calm working atmosphere, a celebration, or a Christmassy look. Apply one preset or color recipe, optionally with a gentle finite fade. Use these colors as a subtle companion to conversation. Brief cues work too, such as an error, a request for attention, a short blink or a finished task: read chroma_get_look first, set the cue, wait, then pass that look back to restore it. Always say the error or request in words as well; color only accompanies them. Give a preset id from chroma_list_presets or #RRGGBB seed colors, with optional rotation, appearance, mode, monochrome, surfaceOffset and neutralGround; fields left out come from the user's own look, so a call without them returns to it. Or give look, a complete look from chroma_get_look. fadeMs fades once to the result. Every look is contrast-checked. It shows until the next call, until the user changes colors (the user always wins), or until agent access is turned off, and it is never saved; chroma_save_preset keeps one. Dark and light may switch at most once a second, so a look never flashes the whole window; a refused call reports retryAfterMs.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        preset: {type: "string", maxLength: 70, pattern: "^(local:)?[a-z0-9]+(-[a-z0-9]+)*$", description: "A preset id from chroma_list_presets, such as spider-man or local:my-look."},
        colors: {type: "array", minItems: 1, maxItems: 3, items: {type: "string", pattern: HEX}, description: "Seed colors: three for color mode, two or three for duo, one or three for mono."},
        rotation: {type: "number", description: "Finite degrees, normalized modulo 360, to rotate every hue."},
        appearance: {type: "string", enum: ["dark", "light", "auto"]},
        mode: {type: "string", enum: ["trichrome", "bichrome", "dichrome", "monochrome", "color", "duo", "mono"]},
        monochrome: {type: "string", pattern: HEX, description: "One seed color for mono mode."},
        surfaceOffset: {type: "integer", enum: [0, 90], description: "Degrees between the ground hue and the primary hue."},
        neutralGround: {type: "boolean", description: "Gray grounds with colored accents."},
        look: {type: "object", description: "A complete look from chroma_get_look, restored exactly. Send it alone or with fadeMs."},
        fadeMs: {type: "integer", minimum: 0, maximum: MAX_FADE_MS, description: "0 changes at once; an animated fade is 1000–300000 milliseconds."},
      },
    },
  },
  chroma_save_preset: {
    description: "Create a new local preset from an explicit look, for example a recipe you made together or a snapshot from chroma_get_look. It only creates; it never changes or removes a saved preset. Use a kebab-case name such as christmas-cheer. Returns the new preset id, which chroma_set_look and chroma_list_presets use, and whether it persisted on this device.",
    inputSchema: {
      type: "object", additionalProperties: false, required: ["name", "look"],
      properties: {
        name: {type: "string", minLength: 1, maxLength: 60, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$", description: "Kebab-case preset name, such as christmas-cheer."},
        look: {type: "object", description: "A look from chroma_get_look."},
      },
    },
  },
  chroma_list_presets: {
    description: "List the presets chroma_set_look can apply by id: the Colors plugin's built-in character looks and the user's saved local presets.",
    inputSchema: {type: "object", properties: {}, additionalProperties: false},
  },
});

class ToolError extends Error {
  constructor(error, message, extra = {}) {
    super(JSON.stringify({error, message, ...extra}));
    this.name = "ChromaToolError";
  }
}
const invalid = message => new ToolError("invalid-arguments", message);

// The subset of JSON Schema the schemas above use, so the advertised schema is
// exactly what is enforced.
function check(schema, value, at) {
  const type = schema.type;
  const ok = type === "object" ? plain(value) : type === "array" ? Array.isArray(value)
    : type === "integer" ? Number.isSafeInteger(value) : type === "number" ? Number.isFinite(value)
    : typeof value === type;
  if (!ok) throw invalid(`${at} must be ${type === "integer" ? "an integer" : `a${/^[aeiou]/.test(type) ? "n" : ""} ${type}`}`);
  if (schema.enum && !schema.enum.includes(value)) throw invalid(`${at} must be one of ${schema.enum.join(", ")}`);
  if (type === "string") {
    if (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity)) throw invalid(`${at} must have ${schema.minLength ?? 0}–${schema.maxLength} characters`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) throw invalid(`${at} is not in the expected form`);
  }
  if ((type === "number" || type === "integer") && (value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) throw invalid(`${at} must be from ${schema.minimum} to ${schema.maximum}`);
  if (type === "array") {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) throw invalid(`${at} must have ${schema.minItems}–${schema.maxItems} items`);
    value.forEach((item, index) => check(schema.items, item, `${at}[${index}]`));
  }
  if (type === "object" && schema.properties) {
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties, key)) throw invalid(`Unknown argument ${at === "arguments" ? "" : at + "."}${key}`);
      check(schema.properties[key], value[key], key);
    }
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) throw invalid(`${key} is required`);
  }
}
function validate(schema, args) {
  if (!plain(args)) throw invalid("Arguments must be a JSON object");
  let text;
  try { text = JSON.stringify(args); } catch { throw invalid("Arguments must be JSON"); }
  if (new TextEncoder().encode(text).length > MAX_ARGUMENT_BYTES) throw invalid(`Arguments must fit in ${MAX_ARGUMENT_BYTES} bytes`);
  const copy = JSON.parse(text);
  check(schema, copy, "arguments");
  return copy;
}

// The engine keeps dark and light grounds far apart in lightness.
export function polarityOf(palette) {
  const hex = palette?.["--bg-app"];
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("The look has no --bg-app color");
  const linear = channel => { const c = parseInt(hex.slice(channel, channel + 2), 16) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
  return .2126 * linear(1) + .7152 * linear(3) + .0722 * linear(5) < .18 ? "dark" : "light";
}

// Repeated dark/light cuts are full-window flashes; agents may loop set_look.
export function polarityGate(now = () => globalThis.performance.now()) {
  let last = -Infinity;
  return Object.freeze({wait: () => Math.max(0, Math.ceil(last + POLARITY_CUT_MS - now())), cut: () => { last = now(); }});
}

// Four tools that share one live look handle. Call `.dispose()` to release it.
export function createAgentTools(api, {gate = polarityGate()} = {}) {
  for (const method of ["getLook", "setLook", "savePreset", "listPresets", "generateTheme"])
    if (typeof api?.[method] !== "function") throw new TypeError(`The Chroma API has no ${method}`);
  let handle = null, live = true;
  const handlers = {
    chroma_get_look() {
      const look = api.getLook();
      return look.theme === "bluepinkneon" ? {look, palette: api.generateTheme(look)} : {look};
    },
    chroma_set_look(args) {
      const {fadeMs, look: saved, ...patch} = args;
      if (saved && Object.keys(patch).length) throw invalid("look is a complete look; send it alone or with fadeMs");
      const look = saved ?? patch;
      const before = api.getLook().resolvedAppearance;
      const generated=api.generateTheme(look);
      // generateTheme(default) is a plugin preview, not the host's real palette.
      // Treat a host-default restore as a possible polarity cut, never guess.
      const cut=look.theme==="default"||polarityOf(generated)!==before;
      if (cut) {
        const retryAfterMs = gate.wait();
        if (retryAfterMs > 0) throw new ToolError("appearance-rate-limited", "Dark/light can change at most once a second.", {retryAfterMs});
      }
      const next = api.setLook(fadeMs === undefined ? look : {...look, fadeMs});
      if (typeof next?.dispose !== "function") throw new TypeError("setLook returned no look handle");
      const previous = handle;
      handle = next;
      const after = api.getLook();
      if (cut||after.resolvedAppearance !== before) gate.cut();
      previous?.dispose();
      return {look: after,...(typeof next.transition==="function"?{transition:next.transition()}:{})};
    },
    chroma_save_preset({name, look}) {
      return api.savePreset(name, look);
    },
    chroma_list_presets() {
      return {presets: api.listPresets({includeSaved: true})};
    },
  };
  const tools = Object.entries(SCHEMAS).map(([name, {description, inputSchema}]) => Object.freeze({
    name, description, inputSchema,
    async call(_client, _context, args) {
      if (!live) throw new ToolError("off", "Chroma agent tools are off.");
      const valid = validate(inputSchema, args);
      if(valid.fadeMs>0&&valid.fadeMs<1000)throw invalid("Animated fades must last at least 1000 milliseconds");
      let result;
      try { result = handlers[name](valid); }
      catch (error) { throw error instanceof ToolError ? error : new ToolError("rejected", error instanceof Error ? error.message : String(error)); }
      return JSON.stringify(result);
    },
  }));
  return Object.freeze(Object.defineProperty(tools, "dispose", {value() {
    if (!live) return;
    live = false;
    const previous = handle;
    handle = null;
    previous?.dispose();
  }}));
}

const rpcError = (id, code, message) => ({jsonrpc: "2.0", id, error: {code, message}});

// Answers one JSON-RPC message for `host.serveMcp`; undefined means no reply.
export function agentMcpHandler(tools) {
  const byName = new Map(tools.map(tool => [tool.name, tool]));
  const listed = frozen({tools: tools.map(({name, description, inputSchema}) => ({name, description, inputSchema}))});
  return async message => {
    if (!plain(message) || message.jsonrpc !== "2.0") return rpcError(null, -32600, "Invalid Request");
    const {id, method, params = {}} = message;
    if (typeof method !== "string") return undefined;
    if (!Object.hasOwn(message, "id")) return undefined;
    if (typeof id !== "string" && !Number.isSafeInteger(id)) return rpcError(null, -32600, "Invalid Request");
    if (!plain(params)) return rpcError(id, -32602, "params must be an object");
    const result = value => ({jsonrpc: "2.0", id, result: value});
    switch (method) {
      case "initialize":
        return result({
          protocolVersion: PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0],
          capabilities: {tools: {listChanged: false}},
          serverInfo: {name: "chroma", version: "1"},
        });
      case "ping": return result({});
      case "tools/list": return result(listed);
      case "tools/call": {
        const tool = typeof params.name === "string" ? byName.get(params.name) : undefined;
        if (!tool) return rpcError(id, -32602, `Unknown tool: ${String(params.name).slice(0, 80)}`);
        try { return result({content: [{type: "text", text: await tool.call(undefined, undefined, params.arguments ?? {})}]}); }
        catch (error) { return result({content: [{type: "text", text: error instanceof Error ? error.message : String(error)}], isError: true}); }
      }
      default: return rpcError(id, -32601, "Method not found");
    }
  };
}

// Native and external agent access, both off until `set` turns one on. Each
// transport owns its own tools and look handle, so turning one off never
// releases the other's look; both share one dark/light flip limit.
export function ownAgentControls(ctx, api, onChange = () => {}) {
  const service = name => ctx.reflect?.get?.(name);
  const canFork = typeof ctx.plugin === "function";
  const capabilities = Object.freeze({
    native: canFork && typeof service("agents")?.addTool === "function",
    external: canFork && typeof service("host")?.serveMcp === "function" && typeof service("host")?.spawn === "function",
  });
  const gate = polarityGate();
  const lane = kind => ({kind, want: false, status: capabilities[kind] ? "off" : "unavailable", error: null, generation: 0, slot: null, stopped: Promise.resolve(), settled: Promise.resolve()});
  const lanes = {native: lane("native"), external: lane("external")};
  let disposed = false;

  const view = ({want, status, error}) => Object.freeze({enabled: want, status, ...(error ? {error} : {})});
  const getState = () => Object.freeze({capabilities, native: view(lanes.native), external: view(lanes.external)});
  const update = (lane, status, error) => {
    lane.status = status;
    lane.error = error ? (error instanceof Error ? error.message : String(error)) : null;
    const state = getState();
    queueMicrotask(() => onChange(state));
  };

  // Stops the current slot at once; later starts wait for its scope to end, so
  // Buzz has released its tool names before they are added again.
  function teardown(lane) {
    const slot = lane.slot;
    if (!slot) return lane.stopped;
    lane.slot = null;
    slot.abort(new Error("Stopped"));
    let failure = null;
    try { slot.tools.dispose(); } catch (error) { failure = error; }
    const ended = Promise.all([lane.stopped, slot.fiber?.dispose()]).then(() => { if (failure) throw failure; });
    // The barrier only orders scopes; the caller reports the failure once.
    lane.stopped = ended.catch(() => {});
    return ended;
  }

  function startNative() {
    const slot = {tools: createAgentTools(api, {gate})};
    slot.ready = new Promise((resolve, reject) => {
      slot.abort = reject;
      slot.fiber = ctx.plugin({name: "chroma-agent-tools", inject: ["agents"], apply(scope) {
        try { for (const tool of slot.tools) scope.agents.addTool(tool); resolve(); }
        catch (error) { reject(error); throw error; }
      }});
    });
    return slot;
  }

  function startExternal(lane) {
    const slot = {tools: createAgentTools(api, {gate})};
    const handler = agentMcpHandler(slot.tools);
    const child = new Promise((resolve, reject) => {
      slot.abort = reject;
      // Wrapped: a scope is not a value to resolve a promise with.
      slot.fiber = ctx.plugin({name: "chroma-agent-mcp", inject: ["host"], apply: scope => resolve({scope})});
    });
    const current = () => { if (lane.slot !== slot) throw new Error("Stopped"); };
    slot.ready = (async () => {
      const {host} = (await child).scope;
      // The token stays inside `server`; it goes only to Buzz's own helper.
      const server = await host.serveMcp(handler);
      current();
      server.closed.then(() => {
        if (lane.slot === slot) void fault(lane, new Error("The agent server stopped. Turn external agents off and on to offer the tools again."));
      });
      const helper = await host.spawn(AGENT_PROCESS_ID, {mcp: server});
      current();
      const code = await helper.exited;
      current();
      if (code !== 0) throw new Error(`Buzz's agent helper could not offer the tools (${code === null ? "stopped by a signal" : `exit ${code}`}).`);
    })();
    return slot;
  }

  async function fault(lane, error) {
    lane.want = false;
    const generation = ++lane.generation;
    const cleanup = await teardown(lane).then(() => null, failure => failure);
    const message = error instanceof Error ? error.message : String(error);
    if (generation === lane.generation) update(lane, "error", cleanup ? `${message} Cleanup also failed: ${cleanup.message ?? cleanup}` : message);
  }

  function toggle(lane, on) {
    if (on === lane.want) return lane.settled;
    lane.want = on;
    const generation = ++lane.generation;
    if (lane.slot) update(lane, "stopping");
    const stopping = teardown(lane);
    lane.settled = (async () => {
      try {
        await stopping;
        if (generation !== lane.generation) return;
        if (!on) return update(lane, "off");
        update(lane, "starting");
        lane.slot = lane.kind === "native" ? startNative() : startExternal(lane);
        await lane.slot.ready;
        if (generation === lane.generation) update(lane, "on");
      } catch (error) {
        if (generation === lane.generation) await fault(lane, error);
      }
    })();
    return lane.settled;
  }

  async function set(next) {
    if (disposed) throw new Error("Chroma agent controls are disposed");
    if (!plain(next) || Object.keys(next).some(key => !Object.hasOwn(lanes, key) || typeof next[key] !== "boolean"))
      throw new TypeError("Expected {native?: boolean, external?: boolean}");
    for (const [kind, on] of Object.entries(next))
      if (on && !capabilities[kind]) throw new Error(`This Buzz cannot offer ${kind} agent tools`);
    await Promise.all(Object.entries(next).map(([kind, on]) => toggle(lanes[kind], on)));
    return getState();
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    await Promise.all(Object.values(lanes).map(lane => toggle(lane, false)));
  }
  ctx.effect?.(() => () => void dispose());

  return Object.freeze({
    get: () => Object.freeze({native: lanes.native.want, external: lanes.external.want}),
    getState, set, dispose,
  });
}
