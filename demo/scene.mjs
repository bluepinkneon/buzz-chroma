// Colors intro: an agent in Buzz re-themes the whole app through the real
// chroma_* tool handlers, then a tour of the Colors page. Every color on screen
// comes from roles Colors emits; overlays read the same CSS variables.
import { readFileSync } from "node:fs";

export const colorScheme = "dark";

const icon = readFileSync(new URL("../icon.svg", import.meta.url), "utf8")
  .replace(/width="512" height="512"/, 'width="100%" height="100%"');

// Calm and Continental share mode, neutrals, ground and offset, so the agent's
// fadeMs request is a real engine fade rather than a cut.
const shape = { neutralGround: true, surfaceOffset: 0, mode: "trichrome", appearance: "dark" };
const HARBOR = { colors: ["#4f7cac", "#6fb3a8", "#a9c7e0"], ...shape };
const CONTINENTAL = { colors: ["#9b1b1b", "#c9a227", "#d8b56a"], ...shape };

const tool = (page, name, args = {}) =>
  page.evaluate(([name, args]) => globalThis.__colorsDemo.call(name, args), [name, args]);

function chrome() {
  if (document.getElementById("colors-demo-style")) return;
  const style = document.createElement("style");
  style.id = "colors-demo-style";
  style.textContent = `
    #buzz-demo-caption { background: color-mix(in oklab, var(--surface-popover) 92%, transparent);
      color: var(--text-primary); border: 1px solid var(--border-standard); border-radius: 999px;
      font-size: 19px; padding: 11px 22px; backdrop-filter: blur(14px); box-shadow: 0 14px 40px rgb(0 0 0 / .32); }
    .cd-layer { position: absolute; opacity: 0; transition: opacity 420ms ease, transform 520ms cubic-bezier(.2,.8,.2,1);
      font-family: Inter, -apple-system, system-ui, sans-serif; }
    .cd-layer.on { opacity: 1; transform: none; }
    #cd-tag { top: 106px; left: 50%; translate: -50% 0; transform: translateY(-6px); padding: 6px 14px; border-radius: 999px;
      font: 600 13px/1.2 Inter, system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase;
      color: var(--text-secondary); background: color-mix(in oklab, var(--surface-popover) 90%, transparent);
      border: 1px solid var(--border-standard); }
    #cd-chip { transform: translateY(6px); display: flex; gap: 10px; align-items: center; padding: 7px 12px; border-radius: 10px;
      font: 500 13.5px/1.2 ui-monospace, "SF Mono", Menlo, monospace; color: var(--text-accent);
      background: var(--surface-inset); border: 1px solid var(--border-accent); }
    #cd-chip i { width: 7px; height: 7px; border-radius: 50%; background: var(--affordance-accent-prominent); }
    #cd-chip b { font-weight: 500; color: var(--text-secondary); }
    .cd-card { left: 50%; top: 50%; translate: -50% -50%; transform: translateY(14px) scale(.98); display: grid; justify-items: center;
      gap: 10px; padding: 36px 60px 32px; border-radius: 28px; text-align: center;
      background: color-mix(in oklab, var(--surface-popover) 88%, transparent); border: 1px solid var(--border-standard);
      backdrop-filter: blur(18px); box-shadow: 0 24px 80px rgb(0 0 0 / .4); }
    .cd-card svg { width: 68px; height: 68px; color: var(--text-accent); }
    .cd-card h2 { margin: 6px 0 0; font-size: 48px; font-weight: 650; letter-spacing: -.03em; color: var(--text-primary); }
    .cd-card p { margin: 0; font-size: 22px; color: var(--text-secondary); }
    #cd-end { inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; background: var(--bg-app); }
    #cd-end svg { width: 88px; height: 88px; color: var(--text-accent); }
    #cd-end h2 { margin: 8px 0 0; font-size: 62px; font-weight: 650; letter-spacing: -.035em; color: var(--text-primary); }
    #cd-end p { margin: 0; font-size: 26px; color: var(--text-secondary); }
    #cd-code { left: 50%; top: 50%; translate: -50% -50%; transform: translateY(12px); padding: 24px 32px; border-radius: 18px;
      font: 500 18px/1.7 ui-monospace, "SF Mono", Menlo, monospace; color: var(--text-primary);
      background: color-mix(in oklab, var(--surface-popover) 94%, transparent); border: 1px solid var(--border-accent);
      box-shadow: 0 24px 70px rgb(0 0 0 / .5); white-space: pre; }
    #cd-code em { font-style: normal; color: var(--text-accent); }
    #cd-code span { color: var(--text-tertiary); }
    #cd-say { transform: translateY(8px); display: grid; gap: 14px; padding: 20px 30px; border-radius: 22px;
      background: color-mix(in oklab, var(--surface-popover) 86%, transparent); border: 1px solid var(--border-standard);
      backdrop-filter: blur(16px); box-shadow: 0 20px 60px rgb(0 0 0 / .35); width: max-content; translate: -50% -100%; }
    #cd-say div { display: grid; gap: 3px; }
    #cd-say div[hidden] { display: none; }
    #cd-say small { font: 600 14px/1.2 Inter, system-ui, sans-serif; letter-spacing: .04em; color: var(--text-accent); }
    #cd-say p { margin: 0; font: 600 32px/1.25 Inter, system-ui, sans-serif; letter-spacing: -.015em; color: var(--text-primary); }`;
  document.head.append(style);
  // The prompt caption mirrors the real composer as it is typed.
  addEventListener("input", (event) => {
    if (!globalThis.__cdMirror) return;
    const target = event.target;
    const text = "value" in target ? target.value : target.innerText;
    if (!text.trim()) return;
    document.querySelector("#cd-say [data-line=prompt] p").textContent = text;
    document.getElementById("cd-say").classList.add("on");
  }, true);
  addEventListener("pointermove", (event) => {
    if (!globalThis.__cdFollow) return;
    document.getElementById("buzz-demo-cursor").style.transform = `translate(${event.clientX - 4}px, ${event.clientY - 2}px)`;
  }, true);
}

function layers(icon) {
  const root = document.getElementById("buzz-demo-overlay");
  const add = (id, className, html) => {
    const node = document.createElement("div");
    node.id = id;
    node.className = `cd-layer ${className}`;
    node.innerHTML = html;
    root.insertBefore(node, document.getElementById("buzz-demo-cursor"));
  };
  add("cd-tag", "", "Demo conversation");
  add("cd-chip", "", "");
  add("cd-reveal", "cd-card", `${icon}<h2>Colors</h2><p>Say it with color.</p>`);
  add("cd-end", "", `${icon}<h2>Colors</h2><p>Say it with color.</p>`);
  add("cd-code", "", "");
  add("cd-say", "", '<div data-line="prompt"><small>Riley</small><p></p></div><div data-line="reply" hidden><small>Juniper</small><p></p></div>');
}

const show = (page, id, on = true) => page.evaluate(([id, on]) => document.getElementById(id).classList.toggle("on", on), [id, on]);

async function chip(page, text, anchor) {
  // Measure the rendered text run, not its full-width row.
  const box = await anchor.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const { right, top, height } = range.getBoundingClientRect();
    return { x: right, y: top, width: 0, height };
  });
  await page.evaluate(([html, x, y]) => {
    const node = document.getElementById("cd-chip");
    node.innerHTML = `<i></i>${html}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.classList.add("on");
  }, [text, box.x + box.width + 18, box.y + box.height / 2 - 15]);
}

async function pick(page, demo, value, ms) {
  await page.locator(".chroma-colors-scroll select").first().selectOption(value);
  await demo.pause(ms);
}

async function dial(page, demo, turns, steps360) {
  const box = await page.locator(".chroma-hue-dial").boundingBox();
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 }, r = box.width * 0.375;
  const at = (deg) => ({ x: c.x + Math.sin((deg * Math.PI) / 180) * r, y: c.y - Math.cos((deg * Math.PI) / 180) * r });
  const start = at(0);
  await demo.moveTo(page.locator(".chroma-hue-dial svg circle.chroma-dial-knob"), { duration: 420 });
  await page.evaluate(() => {
    document.getElementById("buzz-demo-cursor").style.setProperty("--move", "0ms");
    globalThis.__cdFollow = true;
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // One real pointer move per step; each round trip already costs about a frame.
  const steps = Math.round(steps360 * turns);
  for (let i = 1; i <= steps; i++) {
    const eased = (1 - Math.cos((Math.PI * i) / steps)) / 2;
    const p = at(eased * 360 * turns);
    await page.mouse.move(p.x, p.y);
  }
  await page.mouse.up();
  await page.evaluate(() => (globalThis.__cdFollow = false));
}

export async function setup({ page, demo }) {
  await page.evaluate(chrome);
  await page.evaluate(layers, icon);
  // The viewer's own saved look is Harbor, a calm custom recipe.
  await tool(page, "chroma_set_look", HARBOR);
  const { look } = await tool(page, "chroma_get_look");
  await tool(page, "chroma_save_preset", { name: "harbor", look });
  await page.getByText("Colors", { exact: true }).first().click();
  await page.locator(".chroma-colors-scroll select").first().selectOption("local:harbor");
  await page.getByText("Juniper", { exact: true }).first().click();
  await page.getByText("Booked. The deck will be on screen", { exact: false }).first().waitFor();
  const composer = page.getByRole("textbox").last();
  const box = await composer.boundingBox();
  await page.evaluate(([x, y]) => {
    const say = document.getElementById("cd-say");
    say.style.left = `${x}px`;
    say.style.top = `${y}px`;
  }, [box.x + box.width / 2, box.y - 18]);
  await demo.moveTo(composer, { duration: 0 });
  await composer.click();
  await demo.pause(800);
}

export default async function ({ page, demo }) {
  const { people, channels } = demo.state;
  const prompt = "Make Buzz look like John Wick booked the meeting room.";

  demo.chapter("Ask an agent");
  await show(page, "cd-tag");
  await page.evaluate(() => (globalThis.__cdMirror = true));
  await page.keyboard.type(prompt, { delay: 12 });
  await page.evaluate(() => (globalThis.__cdMirror = false));
  await demo.pause(200);
  await page.keyboard.press("Enter");
  await page.getByText(prompt, { exact: true }).last().waitFor();
  // Events are stamped in whole seconds; a real beat keeps the reply after the prompt.
  await demo.pause(1000);
  const reply = await fetch(`${demo.origin}/__demo/agent/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pubkey: people.juniper, event: { kind: 9, tags: [["h", channels.juniper.id]], content: "That’ll be one gold coin." } }),
  });
  if (!reply.ok) throw new Error(`Agent reply failed: ${await reply.text()}`);
  const coinText = page.getByText("That’ll be one gold coin.", { exact: true }).last();
  await coinText.waitFor();
  // Pin the real DM line before the caption repeats the same words.
  const coin = await coinText.elementHandle();
  await page.evaluate(() => {
    const line = document.querySelector("#cd-say [data-line=reply]");
    line.querySelector("p").textContent = "That’ll be one gold coin.";
    line.hidden = false;
  });
  await chip(page, "chroma_get_look", coin);
  const before = await tool(page, "chroma_get_look");
  if (before.look.localName !== "harbor") throw new Error("Harbor is not the starting look");
  await demo.pause(350);
  await chip(page, "chroma_set_look <b>fadeMs: 4000</b>", coin);
  const fade = await tool(page, "chroma_set_look", { ...CONTINENTAL, fadeMs: 4000 });
  if (fade.transition?.status !== "fading") throw new Error(`The Continental look cut instead of fading: ${JSON.stringify(fade)}`);
  await demo.pause(1300);
  await show(page, "cd-tag", false);
  await demo.pause(2900);
  demo.poster();
  await demo.pause(400);
  const { look } = await tool(page, "chroma_get_look");
  await chip(page, "chroma_save_preset <b>continental</b>", coin);
  await tool(page, "chroma_save_preset", { name: "continental", look });
  await demo.pause(800);
  await show(page, "cd-chip", false);
  await show(page, "cd-say", false);
  await demo.pause(380);
  await show(page, "cd-reveal");
  await demo.pause(1600);
  await show(page, "cd-reveal", false);
  await demo.pause(250);

  demo.chapter("Pick a look");
  await demo.openPage("Colors");
  await demo.captionPosition("bottom");
  await demo.caption("28 looks to start from", 0);
  await demo.moveTo(page.locator(".chroma-colors-scroll select").first(), { duration: 300 });
  for (const value of ["spider-man", "daredevil", "batman", "john-wick", "ezio-auditore"]) await pick(page, demo, value, 750);

  demo.chapter("Make it yours");
  await demo.caption("Light, dark or auto · one, two or three colors", 0);
  await demo.click(page.getByRole("button", { name: "Dark", exact: true }), { after: 650 });
  await demo.click(page.getByRole("button", { name: "Bichrome", exact: true }), { after: 550 });
  await demo.click(page.getByRole("button", { name: "Monochrome", exact: true }), { after: 550 });
  await demo.click(page.getByRole("button", { name: "Trichrome", exact: true }), { after: 400 });
  await demo.caption("Turn the dial. Contrast holds.", 0);
  await dial(page, demo, 0.5, 40);
  await demo.pause(500);

  demo.chapter("Every shade");
  await demo.caption("96 shades, 16 ANSI colors and status — each one measured", 0);
  await demo.hover(page.getByText("Your generated colors", { exact: true }), 1800);

  demo.chapter("Saved looks");
  await demo.caption("Juniper saved Continental. Recall it any time.", 0);
  await demo.moveTo(page.locator(".chroma-colors-scroll select").first());
  await pick(page, demo, "local:continental", 1600);

  demo.chapter("One switch");
  await demo.hideCaption();
  const scroller = page.locator(".chroma-colors-scroll");
  await scroller.evaluate((node) => node.scrollTo({ top: node.scrollHeight, behavior: "smooth" }));
  await demo.captionPosition("top");
  await demo.caption("One switch lets agents in Buzz use color", 0);
  await demo.pause(400);
  await demo.click(page.getByText("Agent expression", { exact: true }), { after: 400 });
  await scroller.evaluate((node) => node.scrollTo({ top: node.scrollHeight, behavior: "smooth" }));
  await demo.hover(page.getByRole("checkbox", { name: "Let agents control colors" }), 1500);

  demo.chapter("For plugin authors");
  await demo.hideCaption();
  await page.evaluate(() => {
    document.getElementById("cd-code").innerHTML =
      '<span>// any Buzz plugin · inject: ["chroma"]</span>\n' +
      "const look = ctx.<em>chroma.getLook</em>()\n" +
      'ctx.<em>chroma.setLook</em>({ preset: "batman", fadeMs: 2000 })\n' +
      "ctx.<em>chroma.generateTheme</em>({ colors })";
  });
  await show(page, "cd-code");
  await demo.pause(2400);
  await show(page, "cd-code", false);
  await scroller.evaluate((node) => node.scrollTo({ top: 0, behavior: "smooth" }));
  await demo.pause(450);

  demo.chapter("Back to calm");
  await demo.moveTo(page.locator(".chroma-colors-scroll select").first());
  await pick(page, demo, "local:harbor", 1000);
  await show(page, "cd-end");
  await demo.pause(2400);
}
