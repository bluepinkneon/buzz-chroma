import test from "node:test";
import assert from "node:assert/strict";
import {pointerAngle,hueDial} from "../hue-dial.js";
import {host,find,click} from "./host.mjs";
test("circular pointer geometry is clockwise, wraps continuously and ignores its center",()=>{
  const box={left:17,top:31,width:128,height:128};
  for(let angle=0;angle<360;angle++) {
    const theta=angle*Math.PI/180;
    assert.equal(pointerAngle(81+48*Math.sin(theta),95-48*Math.cos(theta),box),angle);
  }
  assert.equal(pointerAngle(81,95,box),null);
  assert.equal(pointerAngle(NaN,95,box),null);
  assert.equal(pointerAngle(81,95,{...box,width:0}),null);
});
test("dial keyboard and captured pointer edits share the real saved rotation path",()=>{
  const h=host(),app=h.boot(),api=app.services.get("chroma");
  const dial=()=>find(app.tree(),node=>node.tag==="input"&&node.props.id==="bluepinkneon-rotation").props;
  const pointer=()=>find(app.tree(),node=>node.props?.className==="chroma-hue-dial").props;
  const key=key=>dial().onKeyDown({key,preventDefault(){}});
  for(const [k,expected] of [["ArrowLeft",359],["ArrowRight",0],["PageUp",15],["PageDown",0],["End",359],["Home",0]]){key(k);assert.equal(api.getLook().rotation,expected);}
  const captured=new Set(),target={getBoundingClientRect:()=>({left:17,top:31,width:128,height:128}),querySelector:()=>({focus(){}}),setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
  const event={currentTarget:target,pointerId:7,button:0,buttons:1,isPrimary:true,clientX:129,clientY:95,preventDefault(){}};
  const seeds=api.getLook().hues;
  pointer().onPointerDown({...event,isPrimary:false});assert.equal(api.getLook().rotation,0);
  pointer().onPointerDown({...event,button:2});assert.equal(api.getLook().rotation,0);
  pointer().onPointerDown(event);assert.equal(api.getLook().rotation,90);
  pointer().onPointerMove({...event,clientX:81,clientY:143});assert.equal(api.getLook().rotation,180);
  pointer().onPointerMove({...event,buttons:2,clientX:33});assert.equal(api.getLook().rotation,180);
  pointer().onPointerUp(event);assert.equal(captured.size,0);
  pointer().onPointerMove({...event,clientX:33});assert.equal(api.getLook().rotation,180);
  click(app,"Bichrome");key("ArrowRight");assert.equal(api.getLook().rotation,181);assert.deepEqual(api.getLook().hues,seeds);
  assert.equal(JSON.parse(h.saved.get("com.ranveer.bluepinkneon:theme:v3")).rotation,181);app.dispose();
});
