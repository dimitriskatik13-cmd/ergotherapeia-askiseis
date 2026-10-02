import test from 'node:test';
import assert from 'node:assert/strict';
import {LETTERS_LOWER,LETTERS_UPPER,LETTERS_NUMBERS} from '../js/letters/index.js';
import {Tracer} from '../js/engine/tracer.js';
const greek=[...LETTERS_LOWER,...LETTERS_UPPER];
const make=(letter,s,side)=>{const t=new Tracer(letter,s);t.setToleranceFloor(12/side);return t;};
const draw=(t,p)=>{t.beginTouch(p[0]);t.feed(p);return t.endTouch();};
const line=(a,b,n=20)=>Array.from({length:n+1},(_,i)=>({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}));
function naturalGap(points){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
 const target=lengths.reduce((a,b)=>a+b,0)*.98,out=[points[0]];let acc=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=lengths[i-1];if(acc+d>target){const f=d?(target-acc)/d:0;out.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});break;}out.push(b);acc+=d;}
 return out;
}
function scan(letter,dense=true){
 const all=letter.strokes.flatMap(s=>s.points),x0=Math.min(...all.map(p=>p.x)),x1=Math.max(...all.map(p=>p.x)),y0=Math.min(...all.map(p=>p.y)),y1=Math.max(...all.map(p=>p.y));
 const result=[];for(let k=0;k<5;k++){const y=y0+(y1-y0)*k/4;result.push(...line({x:k%2?x1:x0,y},{x:k%2?x0:x1,y},dense?20:1));}return result;
}
test('local geometry rejects continuous raster scans at real letter scales and every accuracy setting',()=>{
 for(const char of ['α','β','Β'])for(const s of [0,.25,.4,.5,1])for(const side of [56,97.8,112,140.22,151.62,319.2])for(const dense of [false,true]){
  const l=greek.find(l=>l.char===char),t=make(l,s,side);draw(t,scan(l,dense));assert.equal(t.done,false,`${char} s${s} side${side} dense${dense}`);
 }
});
test('all Greek shapes retain arbitrary direction order and many lifted pieces at small and large scales',()=>{
 for(const l of greek)for(const s of [0,.4,1])for(const side of [56,97.8,319.2]){
  const t=make(l,s,side),pieces=[];
  for(const st of l.strokes){const p=st.points;for(let k=0;k<7;k++)pieces.push(p.slice(Math.floor(k*(p.length-1)/7),Math.floor((k+1)*(p.length-1)/7)+1));}
  for(const [k,p]of pieces.reverse().entries())draw(t,k%2?p:p.slice().reverse());assert.equal(t.done,true,`${l.char} s${s} side${side}`);
 }
});
test('small correct Greek handwriting retains two pixel smooth deviations without signed direction constraints',()=>{
 for(const l of greek)for(const s of [0,.4,1])for(const side of [56,112,319.2]){
  const t=make(l,s,side);
  for(const st of l.strokes.slice().reverse())draw(t,st.points.slice().reverse().map((p,i)=>({x:p.x+2/side*(.45+.55*Math.sin(i*.29)),y:p.y+2/side*(.35+.65*Math.cos(i*.23))})));
  assert.equal(t.done,true,`${l.char} s${s} side${side}`);
 }
});
test('geometry-aware coverage still waits for lift and snapshot rollback restores it exactly',()=>{
 const l=greek.find(l=>l.char==='β'),t=make(l,.4,151.62),before=t.snapshot();
 t.beginTouch(scan(l)[0]);t.feed(scan(l));t.restore(before);assert.deepEqual(t.snapshot(),before);
 t.beginTouch(l.strokes[0].points.at(-1));t.feed(l.strokes[0].points.slice().reverse());assert.equal(t.done,false);assert.equal(t.endTouch().type,'complete');
});
test('every numeric shape rejects an unrelated finishing tail using the real lift endpoint',()=>{
 for(const l of LETTERS_NUMBERS)for(const s of [0,.4,.5,1])for(const side of [56,97.8,319.2,450]){
  const t=make(l,s,side);for(const st of l.strokes.slice(0,-1))draw(t,st.points);
  const p=l.strokes.at(-1).points,end=p.at(-1);draw(t,[...p,...line(end,{x:end.x+.4,y:end.y},100)]);assert.equal(t.done,false,`${l.char} s${s} side${side}`);
 }
});
test('numeric endpoint check preserves natural finishing gaps at every accuracy setting',()=>{
 for(const l of LETTERS_NUMBERS)for(const s of [0,.4,.5,1])for(const side of [56,319.2]){
  const t=make(l,s,side);for(const st of l.strokes)draw(t,naturalGap(st.points));assert.equal(t.done,true,`${l.char} s${s} side${side}`);
 }
});
test('a sparse continuous multi-stroke number can advance before the final pointer sample',()=>{
 const l=LETTERS_NUMBERS.find(l=>l.char==='4'),t=make(l,.4,319.2);
 draw(t,l.strokes.flatMap(st=>st.points));assert.equal(t.done,true);
});
