import * as plugin from "../dist/plugin.js";
export function host(saved = new Map()) {
  const attributes = new Map();
  const styles = new Set();
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const mediaListeners = new Set(); const observers = new Set();
  globalThis.matchMedia = () => ({matches:true,addEventListener:(_key,fn)=>mediaListeners.add(fn),removeEventListener:(_key,fn)=>mediaListeners.delete(fn)});
  globalThis.MutationObserver = class { constructor(fn) { this.fn=fn; } observe() { observers.add(this); } disconnect() { observers.delete(this); } };
  globalThis.document = {
    documentElement: {
      getAttribute: (key) => attributes.get(key) ?? null,
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: (key) => attributes.delete(key),
    },
    head: { appendChild: (style) => { style.isConnected = true; styles.add(style); } },
    createElement: () => ({ dataset: {}, isConnected: false, remove() { this.isConnected = false; styles.delete(this); } }),
  };
  return {
    saved, attributes, styles, mediaListeners, observers,
    mode(value) { attributes.set("data-color-mode",value); for(const o of observers) o.fn(); },
    css: () => [...styles][0]?.textContent ?? "",
    boot() {
      let page; const services = new Map();
      const cleanups = [];
      plugin.apply({
        provide: (name,value) => { services.set(name,value); cleanups.push(()=>services.delete(name)); },
        react: {
          useState: () => [0, () => {}],
          useEffect: (fn) => cleanups.push(fn()),
          createElement: (tag, props, ...children) => ({ tag, props, children }),
        },
        effect: (fn) => cleanups.push(fn()),
        pages: { register: (value) => { page = value; } },
      });
      return { services, tree: () => page.component(), dispose: () => cleanups.reverse().forEach((fn) => fn?.()) };
    },
  };
}

export function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  return predicate(node) ? node : node.children?.map((child) => find(child, predicate)).find(Boolean);
}
export const input = (app, name) => find(app.tree(), (n) => n.tag === "input" && n.props["aria-label"] === name);
export const rotate = (app, value) => find(app.tree(), (n) => n.tag === "input" && n.props.type === "range").props.onChange({ target: { value: String(value) } });
export const click = (app, label) => find(app.tree(), (n) => n.tag === "button" && n.children[0] === label).props.onClick();
export const select = (app, value) => find(app.tree(), (n) => n.tag === "select").props.onChange({ target: { value } });
export const variables = (css) => new Map([...css.split("}\n")[0].matchAll(/(--[\w-]+):\s*(#[\da-f]{6});/g)].map((m) => [m[1], m[2]]));

