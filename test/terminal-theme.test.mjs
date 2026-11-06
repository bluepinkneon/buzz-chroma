import test from "node:test";
import assert from "node:assert/strict";
import {ownTerminalColors} from "../terminal-theme.js";
import {host,select} from "./host.mjs";

function declaration() {
  const values=new Map(),writes=[];
  return {writes,getPropertyValue:key=>values.get(key)?.[0]??"",getPropertyPriority:key=>values.get(key)?.[1]??"",
    setProperty(key,value,priority=""){writes.push(key);values.set(key,[value,priority]);},removeProperty(key){writes.push(key);values.delete(key);}};
}
const a={"--surface-panel":"#111111","--text-standard":"#eeeeee","--affordance-accent":"#222222"};
const b={"--surface-panel":"#333333","--text-standard":"#ffffff","--affordance-accent":"#444444"};
test("terminal refresh publishes actual role values once and preserves foreign inline ownership",()=>{
  const style=declaration();style.setProperty("--surface-panel","old","important");
  const owner=ownTerminalColors(style);owner.apply(a);
  const count=style.writes.length;owner.apply({...a});assert.equal(style.writes.length,count);
  for(const [key,value] of Object.entries(a)){assert.equal(style.getPropertyValue(key),value);assert.equal(style.getPropertyPriority(key),"important");}
  style.setProperty("--surface-panel","foreign");owner.apply(b);owner.restore();
  assert.equal(style.getPropertyValue("--surface-panel"),"foreign");assert.equal(style.getPropertyPriority("--surface-panel"),"");
  assert.equal(style.getPropertyValue("--text-standard"),"");
  owner.apply(a);style.setProperty("--text-standard","later","important");owner.restore();
  assert.equal(style.getPropertyValue("--text-standard"),"later");
  const after=style.writes.length;owner.restore();assert.equal(style.writes.length,after);
});
test("shipped runtime keeps terminal values consistent with API roles, then restores on default and disable",()=>{
  const h=host();h.rootStyle.setProperty("--surface-panel","#123456");const app=h.boot(),api=app.services.get("chroma");
  for(const options of [{preset:"daredevil"},{preset:"blue-pink-neon",appearance:"light"}]) {
    const live=api.setLook(options),roles=api.generateTheme(options);
    for(const key of Object.keys(a))assert.equal(h.rootStyle.getPropertyValue(key),roles[key]);
    live.dispose();
  }
  select(app,"default");assert.equal(h.rootStyle.getPropertyValue("--surface-panel"),"#123456");assert.equal(h.rootStyle.getPropertyValue("--text-standard"),"");
  select(app,"blue-pink-neon");app.dispose();assert.equal(h.rootStyle.getPropertyValue("--surface-panel"),"#123456");
});
