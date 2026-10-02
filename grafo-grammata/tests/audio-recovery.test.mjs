import test from 'node:test';
import assert from 'node:assert/strict';
import {Phonemes} from '../js/audio.js';
const response=(byte=82,status=200,type='audio/wav')=>({status,headers:{get:()=>type},arrayBuffer:async()=>new Uint8Array([byte]).buffer});
function web(decode=async()=>({duration:.3})){
  const counts={created:0,started:0,stopped:0,decoded:0};
  class Context{
    constructor(){counts.created++;this.state='running';this.currentTime=0;this.destination={};}
    async decodeAudioData(bytes){counts.decoded++;return decode(bytes);}
    createBufferSource(){return {connect:()=>({connect(){}}),start:()=>counts.started++,stop:()=>counts.stopped++};}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}}};}
  }
  globalThis.window={AudioContext:Context};return {audio:new Phonemes(),counts};
}
test('bad HTTP/HTML/empty preload is discarded and next manual click retries successfully',async(t)=>{
  t.mock.method(console,'warn',()=>{});
  for(const first of [response(60,404,'text/html'),response(60,200,'text/html'),{status:200,arrayBuffer:async()=>new ArrayBuffer(0)}]){
    let calls=0;globalThis.fetch=async()=>++calls===1?first:response();const {audio,counts}=web();
    await audio.preload(['a.mp3']);assert.equal(counts.created,0,'preload must not unlock');assert.equal(counts.started,0);assert.equal(audio.raw.has('a'),false);
    assert.equal(await audio.play('a.mp3'),true);assert.equal(calls,2);assert.equal(audio.buffers.has('a'),true);assert.equal(audio.raw.has('a'),false);
  }
});
test('failed decode evicts invalid raw and retries, including 100 subsequent preparations',async(t)=>{
  t.mock.method(console,'warn',()=>{});let calls=0;const options=[];globalThis.fetch=async(_,opts)=>{options.push(opts);return response(++calls===1?60:82)};
  const {audio,counts}=web(async bytes=>{if(new Uint8Array(bytes)[0]!==82)throw Error('invalid audio');return {duration:.3}});
  await audio.preload(['a']);assert.equal(await audio.play('a'),false);assert.equal(audio.raw.has('a'),false);assert.equal(audio._preparing.size,0);
  for(let i=0;i<100;i++)await audio._ensure('a');
  assert.equal(calls,2);assert.equal(counts.decoded,2);assert.equal(audio.buffers.has('a'),true);
  assert.deepEqual(options[1],{cache:'reload'});assert.equal(audio._retry.size,0);
});
test('100 concurrent preload/ensure requests share one fetch/decode and latest play wins',async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;await Promise.resolve();return response()};const {audio,counts}=web();
  await Promise.all(Array.from({length:100},()=>audio.preload(['a'])));assert.equal(calls,1);assert.equal(counts.created,0);
  const played=await Promise.all(Array.from({length:100},()=>audio.play('a')));
  assert.equal(played.filter(Boolean).length,1);assert.equal(played.at(-1),true);assert.equal(calls,1);assert.equal(counts.decoded,1);assert.equal(counts.started,1);
  assert.equal(audio._fetching.size,0);assert.equal(audio._preparing.size,0);
  assert.equal(await audio.play('a'),true);assert.equal(counts.stopped,1);assert.equal(counts.started,2);
});
test('slow older phoneme preparation cannot start after a newer click',async()=>{
  let release;globalThis.fetch=url=>url.endsWith('a.wav')?new Promise(r=>release=()=>r(response())):Promise.resolve(response());const {audio,counts}=web();
  const old=audio.play('a');assert.equal(await audio.play('p'),true);release();assert.equal(await old,false);assert.equal(counts.started,1);
});
test('stop during decode cancels stale playback but keeps the valid decoded cache for next click',async()=>{
  globalThis.fetch=async()=>response();let release;
  const {audio,counts}=web(()=>new Promise(resolve=>{release=()=>resolve({duration:.3})}));
  const playing=audio.play('a');while(!release)await Promise.resolve();audio.stop();release();
  assert.equal(await playing,false);assert.equal(counts.started,0);assert.equal(audio.buffers.has('a'),true);
  assert.equal(await audio.play('a'),true);assert.equal(counts.started,1);audio.stop();assert.equal(counts.stopped,1);
});
test('HTMLAudio fallback is manual, pauses prior playback and replaces a failed element',async(t)=>{
  t.mock.method(console,'warn',()=>{});globalThis.window={};let made=0,played=0,paused=0;
  globalThis.Audio=class{constructor(){this.id=++made}async play(){played++;if(this.id===1)throw Error('failed media')}pause(){paused++}};
  const audio=new Phonemes();await audio.preload(['a']);assert.equal(played,0);
  assert.equal(await audio.play('a'),false);assert.equal(audio.elements.has('a'),false);
  assert.equal(await audio.play('a'),true);assert.equal(made,2);assert.equal(await audio.play('p'),true);assert.ok(paused>=2);
});
test('AudioContext constructor failure falls back and rejected resume reports failure',async(t)=>{
  t.mock.method(console,'warn',()=>{});let htmlStarts=0;globalThis.Audio=class{async play(){htmlStarts++}pause(){}};
  globalThis.window={AudioContext:class{constructor(){throw Error('unsupported')}}};const fallback=new Phonemes();assert.equal(await fallback.play('a'),true);assert.equal(htmlStarts,1);
  globalThis.fetch=async()=>response();const {audio,counts}=web();audio.unlock();audio.ctx.state='suspended';audio.ctx.resume=async()=>{throw Error('gesture rejected')};
  assert.equal(await audio.play('a'),false);assert.equal(counts.started,0);
  audio.ctx.resume=async()=>{audio.ctx.state='running'};assert.equal(await audio.play('a'),true);assert.equal(counts.started,1);
});
