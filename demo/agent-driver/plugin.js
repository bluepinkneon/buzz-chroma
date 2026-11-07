// Demo only. Finds the tools Colors added to Buzz's agent registry and calls
// their real handlers, as a Buzz agent's session would.
export const inject = ["agents"];
export function apply(ctx) {
  const call = async (name, args = {}) => {
    const tool = ctx.agents.tools().find((entry) => entry.name === name);
    if (!tool) throw new Error(`Buzz has no agent tool named ${name}`);
    return JSON.parse(await tool.call(undefined, undefined, args));
  };
  globalThis.__colorsDemo = { tools: () => ctx.agents.tools().map((entry) => entry.name), call };
  ctx.effect(() => () => { delete globalThis.__colorsDemo; });
}
