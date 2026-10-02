import test from 'node:test';
import assert from 'node:assert/strict';
import {LETTERS_LOWER,LETTERS_UPPER} from '../js/letters/index.js';
import {LOWER as prior} from '../tools/baseline-r1/letters/lower.js';
import {fieldMap,letterContentBottom} from '../js/engine/guide.js';
import {Surface} from '../js/engine/surface.js';
const get=c=>[...LETTERS_LOWER,...LETTERS_UPPER].find(l=>l.char===c);
const extent=points=>({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))});
test('gamma is lower and its loop is wider and taller than r1',()=>{
 const old=prior.find(l=>l.char==='γ').strokes[0].points,now=get('γ').strokes[0].points;
 assert.ok(now[0].y>old[0].y);
 const a=extent(old.filter(p=>p.y>=.82)),b=extent(now.filter(p=>p.y>=.86));
 assert.ok((b.right-b.left)>(a.right-a.left)*1.5);
 assert.ok((b.bottom-b.top)>(a.bottom-a.top)*1.4);
});
test('rho bowl is smaller while final sigma stays on its baseline',()=>{
 const old=extent(prior.find(l=>l.char==='ρ').strokes[0].points),now=extent(get('ρ').strokes[0].points);
 assert.ok((now.right-now.left)<(old.right-old.left)*.9);
 assert.ok((now.bottom-now.top)<(old.bottom-old.top)*.9);
 assert.ok(Math.abs(now.bottom-.82)<.001);
 const final=get('ς').strokes[0].points;
 assert.ok(final.every(p=>p.y<=.82+1e-10));assert.equal(final.at(-1).y,.82);
});
test('Mu goes left to right and Sigma preserves the checked school direction',()=>{
 const m=get('Μ').strokes;
 assert.ok(m[0].points[0].x<m[3].points[0].x);
 assert.ok(m[1].points.at(-1).x>m[1].points[0].x);
 assert.ok(m[2].points.at(-1).x>m[2].points[0].x);
 const direction=st=>[Math.sign(st.points.at(-1).x-st.points[0].x),Math.sign(st.points.at(-1).y-st.points[0].y)];
 assert.deepEqual(get('Σ').strokes.map(direction),[[1,0],[1,1],[-1,1],[1,0]]);
});
test('extended gamma does not clip in comparison, approval, or the main surface',()=>{
 const g=get('γ'),pts=g.strokes[0].points,bottom=letterContentBottom(g);
 for(const [w,h] of [[200,200],[500,380],[300,200],[864,320]]){
  const map=fieldMap(w,h,.08,bottom);
  for(const p of pts)assert.ok(map.ty(p.y+.0225)<=h && map.ty(p.y-.0225)>=0);
  for(const padRatio of [.02,.2,.47]){
   const surface={w,h,padRatio,contentBottom:bottom};Surface.prototype._recomputeMap.call(surface);
   for(const p of pts)assert.ok(surface.map.ty(p.y+.0225)<=h && surface.map.ty(p.y-.0225)>=0);
  }
 }
});
