import test from 'node:test';
import assert from 'node:assert/strict';
import {LOWER} from '../js/letters/lower.js';
import {Tracer} from '../js/engine/tracer.js';
const delta=LOWER.find(l=>l.char==='δ'),points=delta.strokes[0].points;
const seam=points.findIndex((p,i)=>i>20&&Math.hypot(p.x-points[0].x,p.y-points[0].y)<1e-6);
function write(tr,ps){tr.beginTouch(ps[0]);tr.feed(ps);return tr.endTouch();}
test('delta needs the upper part and also allows a lift after the circle',()=>{
 assert.equal(delta.strokes.length,1);assert.ok(seam>0);
 for(const strictness of [0,.4,1]){
  const tr=new Tracer(delta,strictness);write(tr,points.slice(0,seam+1));assert.equal(tr.done,false);
  write(tr,points.slice(seam));assert.equal(tr.done,true);
 }
});
test('delta accepts a clockwise circle or a reversed upper part when its shape is complete',()=>{
 const wrongCircle=new Tracer(delta,.4);
 write(wrongCircle,[...points.slice(0,seam+1)].reverse());write(wrongCircle,points.slice(seam));assert.equal(wrongCircle.done,true);
 const wrongTop=new Tracer(delta,.4);
 write(wrongTop,points.slice(0,seam+1));write(wrongTop,[...points.slice(seam)].reverse());assert.equal(wrongTop.done,true);
});
