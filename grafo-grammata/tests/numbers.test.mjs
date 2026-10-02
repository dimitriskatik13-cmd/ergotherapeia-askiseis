import test from 'node:test';
import assert from 'node:assert/strict';
import {LETTERS_NUMBERS,LETTERS_LOWER} from '../js/letters/index.js';
import {Tracer} from '../js/engine/tracer.js';
const touch=(t,ps)=>{t.beginTouch(ps[0]);t.feed(ps);t.endTouch();};
test('small 8 rejects backwards writing despite the pixel tolerance floor',()=>{
 for(const s of [0,.25,.4,.5,.501,.75,1]){
  const l=LETTERS_NUMBERS[8],bad=new Tracer(l,s),good=new Tracer(l,s);bad.setToleranceFloor(12/56);good.setToleranceFloor(12/56);
  for(const st of l.strokes){touch(bad,[...st.points].reverse());touch(good,st.points);}
  assert.equal(bad.done,false,`reverse 8 @ ${s}`);assert.equal(good.done,true,`forward 8 @ ${s}`);
 }
});
test('7, 17 and 27 require the new crossbar before automatic completion',()=>{
 for(const n of [7,17,27])for(const s of [0,.5,1]){
  const l=LETTERS_NUMBERS[n],tr=new Tracer(l,s);for(const st of l.strokes.slice(0,-1))touch(tr,st.points);
  assert.equal(tr.done,false,`${n} missing bar @ ${s}`);touch(tr,l.strokes.at(-1).points);assert.equal(tr.done,true);
 }
});
test('number notebook guides use digit height without changing the lower-case guides',()=>{
 for(const l of LETTERS_NUMBERS){assert.equal(l.zones.xHeightTop,.205);assert.equal(l.zones.baseline,.82);}
 for(const l of LETTERS_LOWER)assert.equal(l.zones.xHeightTop,.4);
});
