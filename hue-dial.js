const wrap=value=>((Math.round(value)%360)+360)%360;
export function pointerAngle(x,y,bounds) {
  if(![x,y,bounds.left,bounds.top,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)return null;
  const dx=x-bounds.left-bounds.width/2,dy=y-bounds.top-bounds.height/2;
  if(Math.hypot(dx,dy)<Math.min(bounds.width,bounds.height)*.12)return null;
  return wrap(Math.atan2(dx,-dy)*180/Math.PI);
}
export function hueDial(h,value,onChange) {
  const change=value=>onChange({target:{value:String(value)}});
  const point=event=>{const angle=pointerAngle(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect());if(angle!==null)change(angle);};
  const theta=value*Math.PI/180,radius=48,circumference=2*Math.PI*radius;
  return h("div",{className:"chroma-hue-dial",
    onPointerDown:event=>{if(event.button!==0||event.isPrimary===false)return;event.preventDefault();event.currentTarget.querySelector("input").focus();event.currentTarget.setPointerCapture(event.pointerId);point(event);},
    onPointerMove:event=>{if(event.isPrimary!==false&&(event.buttons&1)&&event.currentTarget.hasPointerCapture(event.pointerId))point(event);},
    onPointerUp:event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);},
  },
    h("svg",{viewBox:"0 0 128 128","aria-hidden":true},
      ...Array.from({length:12},(_,i)=>h("circle",{key:i,cx:64+Math.sin(i*Math.PI/6)*58,cy:64-Math.cos(i*Math.PI/6)*58,r:i%3===0?1.6:1,className:"chroma-dial-tick"})),
      h("circle",{cx:64,cy:64,r:radius,className:"chroma-dial-track"}),
      h("circle",{cx:64,cy:64,r:radius,className:"chroma-dial-arc",strokeDasharray:`${value/360*circumference} ${circumference}`,transform:"rotate(-90 64 64)"}),
      h("circle",{cx:64+Math.sin(theta)*radius,cy:64-Math.cos(theta)*radius,r:6,className:"chroma-dial-knob"})),
    h("div",{className:"chroma-dial-value","aria-hidden":true},`${value}°`),
    h("input",{id:"bluepinkneon-rotation",type:"range",min:0,max:359,step:1,value,"aria-label":"Hue rotation","aria-valuetext":`${value} degrees clockwise`,onChange,
      onKeyDown:event=>{const delta={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:15,PageDown:-15};
        if(Object.hasOwn(delta,event.key)){event.preventDefault();change(wrap(value+delta[event.key]));}
        else if(event.key==="Home"||event.key==="End"){event.preventDefault();change(event.key==="Home"?0:359);}},
    }));
}
