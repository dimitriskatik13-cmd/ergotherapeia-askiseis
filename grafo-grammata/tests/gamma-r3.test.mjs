import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LOWER} from '../js/letters/lower.js';
import {UPPER} from '../js/letters/upper.js';
import {LOWER as previousLower} from '../tools/baseline-r2/letters/lower.js';
import {UPPER as previousUpper} from '../tools/baseline-r2/letters/upper.js';
test('gamma follows measured school dots with an elongated loop; unrelated letters preserve r2',()=>{
 const ref=JSON.parse(readFileSync(new URL('../tools/reference/gamma-reference.json',import.meta.url)));
 const points=LOWER.find(l=>l.char==='γ').strokes[0].points;
 for(const [x,y] of ref.observed_dot_centers_pixels){
  const q={x:.5+(x-360.3)*.01,y:.82+(y-90)*.01};
  assert.ok(Math.min(...points.map(p=>Math.hypot(p.x-q.x,p.y-q.y)))<.012,`dot ${x},${y}`);
 }
 const loop=points.filter(p=>p.y>=.769);
 const width=Math.max(...loop.map(p=>p.x))-Math.min(...loop.map(p=>p.x));
 const height=Math.max(...loop.map(p=>p.y))-Math.min(...loop.map(p=>p.y));
 assert.ok(height/width>1.8);
 for(const l of [...LOWER,...UPPER].filter(l=>!['γ','ς','Μ','δ','λ','μ','π','ω','κ'].includes(l.char))){
  const prior=[...previousLower,...previousUpper].find(p=>p.char===l.char);
  assert.deepEqual(l.strokes,prior.strokes,l.char);
 }
});
