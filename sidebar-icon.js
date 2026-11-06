// Older Buzz versions render page icons as <img>, whose SVG document cannot
// inherit currentColor. Tint only this exact icon through an alpha mask. Newer
// Buzz already masks it; its hidden image watcher remains hidden.
export function sidebarIconCss(icon,name='Colors') {
  const blank="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221%22%20height=%221%22/%3E";
  const mask=`background-color:currentColor;mask-image:url("${icon}");-webkit-mask-image:url("${icon}");mask-mode:alpha;mask-size:contain;-webkit-mask-size:contain;mask-position:center;-webkit-mask-position:center;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;`;
  const card='button[data-plugin-id="com.ranveer.bluepinkneon"] > .buzz-choice-row > .buzz-choice-row-leading > span > svg:only-child';
  const scope=`body:has(button[data-plugin-id="com.ranveer.bluepinkneon"][aria-expanded="true"]) aside#plugin-details[aria-label=${JSON.stringify(name+' details')}]`;
  const details=scope+' > div > div > span:first-child > svg:only-child';
  return `img[src="${icon}"]:not([hidden]){content:url("${blank}");${mask}}${card},${details}{${mask}}${card}>*,${details}>*{visibility:hidden;}${scope} > div > div > p{white-space:pre-line;}`;
}
