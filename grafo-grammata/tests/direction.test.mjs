import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_LETTERS, LETTERS_LOWER, LETTERS_UPPER } from '../js/letters/index.js';
import { Tracer } from '../js/engine/tracer.js';
function dense(points){
 const out=[];
 for(let i=1;i<points.length;i++)for(let j=0;j<8;j++){
  const a=points[i-1],b=points[i],t=j/8;out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 }
 out.push(points.at(-1)); return out;
}
function touch(tr,ps){tr.beginTouch(ps[0]);tr.feed(ps);return tr.endTouch();}
for(const strictness of [0,0.4,1]){
 test(`all ${ALL_LETTERS.length} templates complete forwards at ${strictness}`,()=>{
  for(const l of ALL_LETTERS){
   const tr=new Tracer(l,strictness);
   for(const st of l.strokes)touch(tr,dense(st.points));
   assert.equal(tr.done,true,`${l.char}: progress ${tr.progress}, active ${tr.active}`);
  }
 });
 test(`letters accept reverse strokes; numbers keep direction checking at ${strictness}`,()=>{
  for(const l of ALL_LETTERS){
   const tr=new Tracer(l,strictness);
   for(const st of l.strokes)touch(tr,dense(st.points).reverse());
   assert.equal(tr.done,l.case !== 'numbers',l.char);
  }
 });
}
const get=c=>ALL_LETTERS.find(x=>x.char===c);
test('lifting midway and resuming forward completes',()=>{
 const l=get('γ'),ps=dense(l.strokes[0].points),tr=new Tracer(l);
 touch(tr,ps.slice(0,Math.floor(ps.length/2)));
 assert.equal(tr.done,false);
 touch(tr,ps.slice(Math.floor(ps.length/2)-1)); assert.equal(tr.done,true);
});
test('shortcuts across curves do not complete',()=>{
 for(const c of ['ο','γ','μ','Ω']){
  const l=get(c), tr=new Tracer(l);
  for(const st of l.strokes)touch(tr,[st.points[0],st.points.at(-1)]);
  assert.equal(tr.done,false,c);
 }
});
test('complete letters accept a different stroke order',()=>{
 for(const c of ['Κ','Μ','Π','ψ','ρ']){
  const l=get(c),tr=new Tracer(l);
  for(const st of [...l.strokes].reverse())touch(tr,dense(st.points));
  assert.equal(tr.done,true,c);
 }
});
test('palm cancellation restores progress exactly',()=>{
 const tr=new Tracer(get('Ι')),snap=tr.snapshot();
 const ps=dense(get('Ι').strokes[0].points);
 tr.beginTouch(ps[0]);tr.feed(ps.slice(0,40));tr.restore(snap);
 assert.deepEqual(tr.snapshot(),snap);
 touch(tr,ps);assert.equal(tr.done,true);
});
test('reset allows a fresh attempt in either direction',()=>{
 const l=get('ο'),tr=new Tracer(l),ps=dense(l.strokes[0].points);
 touch(tr,[...ps].reverse());assert.equal(tr.done,true);
 tr.reset();assert.equal(tr.done,false);
 touch(tr,ps);assert.equal(tr.done,true);
});
test('final sigma and connected kappa geometry',()=>{
 assert.equal(LETTERS_LOWER.length,25);assert.equal(LETTERS_UPPER.length,24);
 assert.ok(get('ς'));
 for(const c of ['κ','Κ']){
  const l=get(c),stem=l.strokes[0].points,top=l.strokes[1].points,bottom=l.strokes[2].points;
  const join=c==='κ'?top[0]:top.at(-1);
  assert.equal(join.x,stem[0].x);assert.deepEqual(join,bottom[0]);
  assert.equal(top.at(-1).y>top[0].y,c==='Κ');
 }
 const mu=get('μ').strokes[2].points;assert.ok(mu.at(-1).y<Math.max(...mu.map(p=>p.y))-0.035);
});

test('sparse straight letter stroke is accepted in either direction',()=>{
 const l=get('Ι'),a=l.strokes[0].points[0],b=l.strokes[0].points.at(-1);
 const good=new Tracer(l);touch(good,[a,b]);assert.equal(good.done,true);
 const reverse=new Tracer(l);touch(reverse,[b,a]);assert.equal(reverse.done,true);
});

test('resume at beta self-intersection retains the completed upper loop',()=>{
 const l=get('β'),points=l.strokes[0].points;
 const seam=points.findIndex((p,i)=>i>5&&Math.hypot(p.x-points[0].x,p.y-points[0].y)<1e-6);
 assert.ok(seam>0);
 const tr=new Tracer(l);touch(tr,dense(points.slice(0,seam+1)));
 assert.equal(tr.done,false);touch(tr,dense(points.slice(seam)));assert.equal(tr.done,true);
});
