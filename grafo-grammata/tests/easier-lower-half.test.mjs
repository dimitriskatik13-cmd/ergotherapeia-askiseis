import test from 'node:test';
import assert from 'node:assert/strict';
import {Tracer} from '../js/engine/tracer.js';
import {ALL_LETTERS} from '../js/letters/index.js';
const alpha=ALL_LETTERS.find(l=>l.char==='α');
function draw(tr,points){tr.beginTouch(points[0]);tr.feed(points);tr.endTouch();}
test('alpha completes with a natural end gap or smaller wobbly shape through the midpoint',()=>{
 const variants=[ps=>ps.slice(0,Math.floor(ps.length*.90)),ps=>ps.slice(0,Math.floor(ps.length*.94)).map((p,i)=>({x:.5+(p.x-.5)*.83+.025+Math.sin(i*.5)*.012,y:.6+(p.y-.6)*.9-.015+Math.cos(i*.4)*.012}))];
 for(const s of [0,.25,.4,.5])for(const variant of variants){const tr=new Tracer(alpha,s);tr.setToleranceFloor(12/240);for(const st of alpha.strokes)draw(tr,variant(st.points));assert.equal(tr.done,true,`alpha at ${s}`);}
});
test('easier alpha needs both its bowl and its leg, in either direction',()=>{
 for(const s of [0,.25,.5]){
  const bowlOnly=new Tracer(alpha,s);draw(bowlOnly,alpha.strokes[0].points);assert.equal(bowlOnly.done,false);
  const reversed=new Tracer(alpha,s);for(const st of alpha.strokes)draw(reversed,[...st.points].reverse());assert.equal(reversed.done,true);
  const half=new Tracer(alpha,s);for(const st of alpha.strokes)draw(half,st.points.slice(0,Math.floor(st.points.length*.60)));assert.equal(half.done,false);
 }
});
test('all 81 templates keep rejecting unrelated scribbles in the easier half',()=>{
 for(const s of [0,.5])for(const letter of ALL_LETTERS){
  let seed=124;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const tr=new Tracer(letter,s);for(const st of letter.strokes)draw(tr,[st.points[0],...Array.from({length:200},()=>({x:.15+rand()*.7,y:.1+rand()*.85}))]);assert.equal(tr.done,false,`${letter.char} @ ${s}`);
 }
});
