import test from 'node:test';
import assert from 'node:assert/strict';
import {InputController} from '../js/engine/input.js';
import {Pencil} from '../js/engine/pencil.js';
import {Session} from '../js/session.js';
function harness(){
 const listeners={},calls=[],captured=new Set();
 const el={addEventListener:(name,cb)=>listeners[name]=cb,setPointerCapture:id=>captured.add(id),releasePointerCapture:id=>captured.delete(id)};
 const surface={el,toNorm:(x,y)=>({x:x/100,y:y/100})};
 const input=new InputController(surface,{onDown:p=>calls.push(['down',p]),onMove:p=>calls.push(['move',p]),onUp:p=>calls.push(['up',p]),onCancel:()=>calls.push(['cancel'])});
 input.enable();
 const fire=(name,props={})=>{const e={pointerId:1,pointerType:'pen',clientX:20,clientY:30,pressure:.4,width:1,height:1,preventDefault(){},...props};listeners[name]?.(e);return e;};
 return {input,fire,calls,captured};
}
test('pen forwards coordinates, coalesced samples and pressure in order',()=>{
 const h=harness();h.fire('pointerdown');
 h.fire('pointermove',{getCoalescedEvents:()=>[{clientX:21,clientY:31,pressure:.2,pointerType:'pen'},{clientX:22,clientY:32,pressure:.8,pointerType:'pen'}]});
 h.fire('pointerup');
 assert.deepEqual(h.calls.map(c=>c[0]),['down','move','up']);
 assert.deepEqual(h.calls[1][1].map(p=>p.p),[.2,.8]);assert.equal(h.calls[1][1][1].x,.22);assert.equal(h.captured.size,0);
});
test('pen works without coalesced events and with an empty coalesced list',()=>{
 for(const extra of [{},{getCoalescedEvents:()=>[]}]){const h=harness();h.fire('pointerdown');h.fire('pointermove',{clientX:40,...extra});assert.equal(h.calls[1][1][0].x,.4);}
});
test('pen cancels active touch and ignores concurrent palm',()=>{
 const h=harness();h.fire('pointerdown',{pointerId:2,pointerType:'touch',width:45,height:45});h.fire('pointerdown');
 h.fire('pointerdown',{pointerId:3,pointerType:'touch',width:90,height:90});h.fire('pointerup');
 assert.deepEqual(h.calls.map(c=>c[0]),['down','cancel','down','up']);
});
test('large palm rejected but ordinary finger works before Pencil contact',()=>{
 const h=harness();h.fire('pointerdown',{pointerType:'touch',width:80});assert.equal(h.calls.length,0);
 h.fire('pointerdown',{pointerType:'touch',width:45,height:45});assert.equal(h.calls[0][0],'down');
});
test('pen-only rejects both touch and mouse, while accepting pen',()=>{
 const h=harness();h.input.setPenOnly(true);
 h.fire('pointerdown',{pointerType:'touch'});h.fire('pointerdown',{pointerType:'mouse'});
 assert.equal(h.calls.length,0);h.fire('pointerdown');assert.equal(h.calls[0][1].type,'pen');
});
test('hover exit without Pencil contact does not block normal finger',()=>{
 const h=harness();h.fire('pointerleave',{pointerType:'pen'});h.fire('pointerdown',{pointerType:'touch',width:40,height:40});
 assert.equal(h.calls[0]?.[0],'down');
});
test('recent actual Pencil contact rejects palm then releases after 8 seconds',()=>{
 const saved=Date.now;let now=100000;Date.now=()=>now;
 try {const h=harness();h.fire('pointerdown');now+=9000;h.fire('pointerup');
  h.fire('pointerdown',{pointerType:'touch'});assert.equal(h.calls.length,2);
  now+=8100;h.fire('pointerdown',{pointerType:'touch'});assert.equal(h.calls.length,3);
 } finally{Date.now=saved;}
});
test('pointer cancellation or lost capture cancels without completing',()=>{
 for(const event of ['pointercancel','lostpointercapture']){const h=harness();h.fire('pointerdown');h.fire(event);assert.deepEqual(h.calls.map(c=>c[0]),['down','cancel'],event);assert.equal(h.input.activeId,null);}
});
test('disabled input never starts writing',()=>{const h=harness();h.input.disable();h.fire('pointerdown');assert.equal(h.calls.length,0);});
function penContext(){const widths=[],ends=[];return {widths,ends,save(){},restore(){},beginPath(){},arc(){},fill(){},moveTo(){},quadraticCurveTo(){},stroke(){widths.push(this.lineWidth)},lineTo(x,y){ends.push([x,y])}};}
test('pressure changes width only when enabled and all widths stay positive',()=>{
 const map={tx:x=>x*100,ty:y=>y*100,s:v=>v*100};
 for(const pressure of [false,true]){const c=penContext(),p=new Pencil(c,map,{pressure});p.begin({x:0,y:0,p:.2});p.extend([{x:.2,y:.2,p:.1},{x:.5,y:.5,p:1}]);p.end();assert.ok(c.widths.every(w=>w>0));assert.equal(c.widths[1]>c.widths[0],pressure);assert.deepEqual(c.ends.at(-1),[50,50]);}
});
test('actual pointer-up endpoint is inked, not only counted by the tracer',()=>{
 const calls=[];const point={x:.5,y:.8,p:.4,type:'pen'};
 Session.prototype._up.call({pencil:{extend:p=>calls.push(['extend',p]),end:()=>calls.push(['end'])},tracer:null},point);
 assert.deepEqual(calls,[['extend',[point]],['end']]);
});

test('rotation redraws completed ink at the new size without losing tracer progress',()=>{
 const c=penContext(),tracer={progress:[75],setToleranceFloor(){}};
 const fake={surface:{map:{side:200,tx:x=>x*200,ty:y=>y*200,s:v=>v*200},clear(){},ctx:()=>c},
  tracer,mode:'trace',pencil:null,completed:true,_redrawGuide(){},
  inkHistory:[{points:[{x:.2,y:.3,p:.4},{x:.4,y:.8,p:.7}],opts:{baseWidth:.02,pressure:false}}],
  _redrawInk:Session.prototype._redrawInk};
 Session.prototype._redrawAll.call(fake);
 assert.deepEqual(c.ends.at(-1),[80,160]);assert.deepEqual(tracer.progress,[75]);assert.equal(fake.completed,true);
});

test('capture loss preserves the last mouse/Pencil stroke without auto-completing',()=>{
 for(const type of ['mouse','pen']){
  let ended=0;const points=[{x:.2,y:.3,p:.4,type},{x:.4,y:.8,p:.5,type}];
  const active={points,opts:{}};const previous={points:[{x:0,y:0,p:.5,type}],opts:{}};
  const fake={pencil:{end:()=>ended++},activeStroke:active,inkHistory:[previous],_undoValid:true,_tracerSnap:{},completed:false,
   tracer:{touchAllowed:true,progress:[30]},feedback:{clearHint(){}},_cancelStroke(){assert.fail('real stroke must not be erased')}};
  Session.prototype._interruptStroke.call(fake);
  assert.equal(ended,1);assert.deepEqual(fake.inkHistory,[previous,active]);assert.equal(fake.pencil,null);
  assert.equal(fake.completed,false);assert.deepEqual(fake.tracer.progress,[30]);assert.equal(fake.tracer.touchAllowed,false);
 }
});
test('a cancelled touch still rolls back the possible palm stroke',()=>{
 let cancelled=0;const fake={pencil:{},activeStroke:{points:[{type:'touch'}]},_cancelStroke:()=>cancelled++};
 Session.prototype._interruptStroke.call(fake);assert.equal(cancelled,1);
});
test('resize during mouse writing keeps previous and in-progress strokes',()=>{
 const ctx=penContext();const points=[{x:.2,y:.3,p:.4,type:'mouse'},{x:.4,y:.8,p:.5,type:'mouse'}];
 const fake={surface:{map:{side:200,tx:x=>x*200,ty:y=>y*200,s:v=>v*200},clear(){},ctx:()=>ctx},
  mode:'trace',completed:false,tracer:{setToleranceFloor(){},progress:[30],touchAllowed:true},
  pencil:{end(){}},activeStroke:{points,opts:{}},inkHistory:[],input:{disable(){},enable(){}},feedback:{clearHint(){}},
  _redrawGuide(){},_interruptStroke:Session.prototype._interruptStroke,_redrawInk:Session.prototype._redrawInk};
 Session.prototype._redrawAll.call(fake);assert.equal(fake.inkHistory.length,1);assert.deepEqual(ctx.ends.at(-1),[80,160]);assert.deepEqual(fake.tracer.progress,[30]);
});
test('selecting the already active mode/letter does not restart and erase ink',()=>{
 const letter={char:'ι'};const fake={letter,mode:'trace',_start(){assert.fail('same selection must preserve ink')}};
 Session.prototype.configure.call(fake,{letter,mode:'trace'});
});
