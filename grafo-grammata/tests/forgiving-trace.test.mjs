import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_LETTERS} from '../js/letters/index.js';
import {Tracer} from '../js/engine/tracer.js';
const letters=ALL_LETTERS.filter(l=>['α','ε','ο','γ','δ','λ','μ','ρ','ς','Μ','Σ','β','π','ω'].includes(l.char));
function stroke(tr,points){tr.beginTouch(points[0]);tr.feed(points);return tr.endTouch();}
test('slightly offset handwriting with a small natural end gap completes at default and loose settings',()=>{
 for(const strictness of [0,.4])for(const l of letters){
  const tr=new Tracer(l,strictness);
  for(const s of l.strokes){
   const count=Math.max(2,Math.floor(s.points.length*.96));
   const ps=s.points.slice(0,count).map((p,i)=>({x:p.x+.016+Math.sin(i*.6)*.004,y:p.y-.014+Math.cos(i*.5)*.004}));
   stroke(tr,ps);
  }
  assert.equal(tr.done,true,`${l.char} @ ${strictness}, progress ${tr.progress}`);
 }
});
test('starting by the number and approaching the true start in the same stroke works',()=>{
 const l=ALL_LETTERS.find(l=>l.char==='Ι'),ps=l.strokes[0].points,tr=new Tracer(l);
 stroke(tr,[{x:ps[0].x-.075,y:ps[0].y-.08},...ps]);assert.equal(tr.done,true);
});

test('beta epsilon and delta accept smaller/wobbly attempts but not unrelated scribbles',()=>{
 for(const char of ['β','ε','δ']){
  const l=ALL_LETTERS.find(l=>l.char===char),good=new Tracer(l,.4);
  for(const st of l.strokes){
   const ps=st.points.slice(0,Math.floor(st.points.length*.96)).map((p,i)=>({x:.5+(p.x-.5)*.9+.018+Math.sin(i*.5)*.009,y:.6+(p.y-.6)*.9-.013+Math.cos(i*.4)*.009}));
   stroke(good,ps);
  }
  assert.equal(good.done,true,char);
  for(let seedStart=1;seedStart<=10;seedStart++){
   let seed=seedStart;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   const bad=new Tracer(l,.4);
   for(const st of l.strokes)stroke(bad,[st.points[0],...Array.from({length:200},()=>({x:.25+rand()*.5,y:.15+rand()*.8}))]);
   assert.equal(bad.done,false,`${char} seed ${seedStart}`);
   if(char==='β'){stroke(bad,l.strokes[0].points);assert.equal(bad.done,true,'retry beta after scribble');}
  }
 }
});
