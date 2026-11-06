import * as plugin from "../dist/plugin.js";
export function host(saved = new Map(), extra = {}) {
  const attributes = new Map();
  const styles = new Set();
  const frames=new Map();let nextFrame=0,time=0;
  Object.defineProperty(globalThis.performance,"now",{configurable:true,value:()=>time});
  globalThis.requestAnimationFrame=fn=>{const id=++nextFrame;frames.set(id,fn);return id;};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  globalThis.getComputedStyle=()=>({backgroundColor:""});
  const flushFrames=()=>{for(let turn=0;turn<3&&frames.size;turn++){const pending=[...frames];frames.clear();for(const [,fn]of pending)fn();}};
  const inline=new Map();
  const rootStyle={getPropertyValue:key=>inline.get(key)?.value??"",getPropertyPriority:key=>inline.get(key)?.priority??"",setProperty:(key,value,priority="")=>inline.set(key,{value,priority}),removeProperty:key=>inline.delete(key)};
  globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const mediaListeners = new Set(); const observers = new Set();
  const mediaQueries=new Map();
  globalThis.matchMedia = query => {
    if(!mediaQueries.has(query))mediaQueries.set(query,{matches:query.includes('color-scheme'),
      addEventListener:(_key,fn)=>mediaListeners.add(fn),removeEventListener:(_key,fn)=>mediaListeners.delete(fn)});
    return mediaQueries.get(query);
  };
  globalThis.MutationObserver = class { constructor(fn) { this.fn=fn; } observe() { observers.add(this); } disconnect() { observers.delete(this); } };
  const documentListeners=new Map();
  globalThis.document = {
    hidden:false,
    addEventListener:(key,fn)=>{if(!documentListeners.has(key))documentListeners.set(key,new Set());documentListeners.get(key).add(fn);},
    removeEventListener:(key,fn)=>documentListeners.get(key)?.delete(fn),
    documentElement: {
      style:rootStyle,
      getBoundingClientRect:()=>({}),
      getAttribute: (key) => attributes.get(key) ?? null,
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: (key) => attributes.delete(key),
    },
    head: { appendChild: (style) => { style.isConnected = true; styles.add(style); } },
    createElement: () => ({ dataset: {}, isConnected: false, remove() { this.isConnected = false; styles.delete(this); } }),
  };
  return {
    saved, attributes, styles, mediaListeners, observers, rootStyle, frames,flushFrames,documentListeners,
    advance(ms){time+=ms;const pending=[...frames];frames.clear();for(const [,fn] of pending)fn(time);},
    visibility(hidden){document.hidden=hidden;for(const fn of documentListeners.get('visibilitychange')??[])fn();},
    reduced(value){matchMedia('(prefers-reduced-motion: reduce)').matches=value;for(const fn of mediaListeners)fn();},
    mode(value) { attributes.set("data-color-mode",value); for(const o of observers) o.fn(); },
    css: () => {flushFrames();return [...styles].find(style=>!style.dataset.role)?.textContent ?? "";},
    boot() {
      let page; const services = new Map();
      const cleanups = [], hooks=[];let hookIndex=0;
      plugin.apply({
        provide: (name,value) => { services.set(name,value); cleanups.push(()=>services.delete(name)); },
        react: {
          useState: initial => {
            const index=hookIndex++;
            if(!hooks[index])hooks[index]={value:initial};
            return [hooks[index].value,next=>{hooks[index].value=typeof next==="function"?next(hooks[index].value):next;}];
          },
          useEffect: fn => {const index=hookIndex++;if(!hooks[index]){hooks[index]={effect:true};cleanups.push(fn());}},
          createElement: (tag, props, ...children) => ({ tag, props, children }),
        },
        effect: (fn) => cleanups.push(fn()),
        pages: { register: (value) => { page = value; } },
        ...extra,
      });
      return { services, title:page.title, icon:page.icon, tree: () => {hookIndex=0;return page.component();}, dispose: () => cleanups.reverse().forEach((fn) => fn?.()) };
    },
  };
}

export function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  return predicate(node) ? node : node.children?.map((child) => find(child, predicate)).find(Boolean);
}
export const input = (app, name) => find(app.tree(), (n) => n.tag === "input" && n.props["aria-label"] === name);
export const rotate = (app, value) => find(app.tree(), (n) => n.tag === "input" && n.props.type === "range").props.onChange({ target: { value: String(value) } });
export const click = (app, label) => find(app.tree(), (n) => n.tag === "button" && (n.children[0] === label||n.props?.["aria-label"]===label)).props.onClick();
export const select = (app, value) => find(app.tree(), (n) => n.tag === "select").props.onChange({ target: { value } });
export const variables = (css) => new Map([...css.split("}\n")[0].matchAll(/(--[\w-]+):\s*(#[\da-f]{6});/g)].map((m) => [m[1], m[2]]));

