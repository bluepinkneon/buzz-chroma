// Commit a palette atomically. Buzz components animate backgrounds but often
// change ink immediately; crossing polarities otherwise produces a weak flash.
export function ownPaletteTransition(document) {
  const root=document.documentElement,attribute="data-chroma-changing",owner="com.ranveer.bluepinkneon";
  const style=document.createElement("style");
  style.dataset.plugin=owner;style.dataset.role="palette-transition";
  const selector=`:root[${attribute}="${owner}"]`;
  style.textContent=`${selector},${selector} *,${selector} *::before,${selector} *::after{transition:none!important;}`;
  document.head.appendChild(style);
  const request=requestAnimationFrame.bind(globalThis),cancel=cancelAnimationFrame.bind(globalThis);
  let frames=[],baseline=null,owned=false,holds=0;
  const cancelPending=()=>{for(const frame of frames)cancel(frame);frames=[];};
  const release=()=>{
    if(owned&&root.getAttribute(attribute)===owner) {
      if(baseline===null)root.removeAttribute(attribute);else root.setAttribute(attribute,baseline);
    }
    owned=false;
  };
  const flush=()=>{getComputedStyle(root).backgroundColor;root.getBoundingClientRect();};
  function begin() {
    cancelPending();
    if(!owned||root.getAttribute(attribute)!==owner)baseline=root.getAttribute(attribute);
    owned=true;if(root.getAttribute(attribute)!==owner)root.setAttribute(attribute,owner);
    if(holds)return;
    frames.push(request(()=>{
      flush();frames.push(request(()=>{frames=[];release();}));
    }));
  }
  return {
    begin,
    hold() {
      holds++;begin();let done=false;
      return ()=>{if(done)return;done=true;holds--;if(!holds)begin();};
    },
    dispose() {
      cancelPending();if(owned)flush();release();style.remove();
    },
  };
}
