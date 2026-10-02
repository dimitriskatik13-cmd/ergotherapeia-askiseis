import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function worker(caches,fetch){
  const events={};vm.runInNewContext(source,{URL,caches,fetch,Request,self:{location:{origin:'https://app.test'},addEventListener:(n,cb)=>events[n]=cb}});
  return async(path,mode='cors',cache='default')=>{let result;const waits=[];events.fetch({request:{url:'https://app.test/'+path,method:'GET',mode,cache},respondWith:p=>result=p,waitUntil:p=>waits.push(p)});const response=await result;await Promise.all(waits);return response;};
}
test('uncached offline HTML fallback is only for navigation, not audio or JS',async()=>{
  const shell={body:'HTML'};let fallbackReads=0;
  const request=worker({match:async req=>{if(req==='index.html'){fallbackReads++;return shell}}},async()=>{throw Error('offline')});
  assert.equal(await request('?char=κ','navigate'),shell);
  await assert.rejects(request('sounds/a.wav'),/offline/);await assert.rejects(request('js/main.js'),/offline/);
  assert.equal(fallbackReads,1);
});
test('navigation without cached shell preserves failure; existing cached assets need no network',async()=>{
  let fetches=0;const hit={body:'WAV'};
  const request=worker({match:async req=>req.url?.endsWith('a.wav')?hit:undefined},async()=>{fetches++;throw Error('offline')});
  assert.equal(await request('sounds/a.wav'),hit);assert.equal(fetches,0);await assert.rejects(request('?new','navigate'),/offline/);
});
test('cache open/put/match failures cannot replace a valid network response',async()=>{
  for(const stage of ['open','put','match']){
    const valid={status:200,type:'basic',body:'WAV',clone:()=>({body:'WAV copy'})};
    const request=worker({match:async()=>{if(stage==='match')throw Error('cache unavailable')},open:async()=>{if(stage==='open')throw Error('cache quota');return {put:async()=>{if(stage==='put')throw Error('cache quota')}}}},async()=>valid);
    assert.equal(await request('sounds/a.wav'),valid,stage);
  }
});
test('failed HTTP responses pass through without poisoning the cache',async()=>{
  let puts=0;const missing={status:404,type:'basic'};
  const request=worker({match:async()=>undefined,open:async()=>({put:async()=>puts++})},async()=>missing);
  assert.equal(await request('sounds/a.wav'),missing);assert.equal(puts,0);
});
test('explicit recovery reload bypasses invalid cache and refreshes it from network',async()=>{
  const invalid={status:200,type:'basic',body:'invalid'};const valid={status:200,type:'basic',body:'WAV',clone:()=>({body:'WAV copy'})};let fetches=0,puts=0;
  const request=worker({match:async()=>invalid,open:async()=>({put:async()=>puts++})},async()=>{fetches++;return valid});
  assert.equal(await request('sounds/a.wav'),invalid);assert.equal(fetches,0);
  assert.equal(await request('sounds/a.wav','cors','reload'),valid);assert.equal(fetches,1);assert.equal(puts,1);
  assert.equal(await request('sounds/a.wav','cors','no-store'),valid);assert.equal(fetches,2);assert.equal(puts,1);
});
