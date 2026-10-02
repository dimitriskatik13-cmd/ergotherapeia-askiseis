import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {Phonemes} from '../js/audio.js';
import {lettersByCase} from '../js/letters/index.js';
test('all letter and number audio references resolve to installed runtime files',()=>{
 globalThis.window={};const audio=new Phonemes();let count=0;
 for(const kind of ['lower','upper','numbers'])for(const letter of lettersByCase(kind)){
  const key=audio._key(letter.phonemeAudio);const path=audio._url(key);
  assert.ok(existsSync(new URL('../'+path,import.meta.url)),`${letter.char}: ${path}`);
  assert.ok(path.endsWith('.wav'));count++;
 }
 assert.equal(count,81);
 assert.equal(audio._url(audio._key('r.mp3')),'sounds/r.wav');
 assert.equal(audio._url(audio._key('r.wav')),'sounds/r.wav');
});
test('playback keeps stop releases intact with only a minimal anti-click envelope',async()=>{
 const ramps=[];let started=false;
 const context={state:'running',currentTime:0,createBufferSource:()=>({connect:()=>({connect(){}}),start:()=>{started=true}}),createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime:(v,t)=>ramps.push([v,t])}})};
 globalThis.window={};const audio=new Phonemes();audio.useWebAudio=true;audio.ctx=context;audio.buffers.set('p',{duration:.257});
 await audio.play('p.mp3');assert.equal(started,true);assert.equal(ramps[0][0],1);assert.ok(ramps[0][1]<=.002);assert.equal(ramps[1][1],.257);
});
