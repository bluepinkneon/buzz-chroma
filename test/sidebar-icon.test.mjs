import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sidebarIconCss} from '../sidebar-icon.js';
import {host,select} from './host.mjs';

test('icon tint targets only our visible image without changing the host layout',()=>{
  const icon='data:image/svg+xml;base64,'+readFileSync(new URL('../icon.svg',import.meta.url)).toString('base64');
  const css=sidebarIconCss(icon);
  assert(css.startsWith(`img[src="${icon}"]:not([hidden]){`));
  for(const declaration of ['background-color:currentColor','mask-image:url(','-webkit-mask-image:url(','mask-size:contain','-webkit-mask-size:contain','mask-position:center','mask-repeat:no-repeat'])assert(css.includes(declaration));
  assert(!/[;{](display|width|height):/.test(css));
});

test('the compiled icon style survives Buzz default, follows the exact registered asset, and is cleaned on disable',()=>{
  const h=host(),app=h.boot();assert.equal(app.title,"Colors");
  const iconStyle=[...h.styles].find(style=>style.dataset.role==='sidebar-icon');assert(iconStyle?.isConnected);
  const icon='data:image/svg+xml;base64,'+readFileSync(new URL('../icon.svg',import.meta.url)).toString('base64');
  assert.equal(app.icon,icon);assert.equal(iconStyle.textContent,sidebarIconCss(icon));
  select(app,'default');assert.equal(h.css(),'');assert(iconStyle.isConnected);assert.equal(h.styles.size,2);
  app.dispose();assert.equal(h.styles.size,0);assert(!iconStyle.isConnected);
});
