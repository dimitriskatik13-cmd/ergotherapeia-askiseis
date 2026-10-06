import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync,statSync} from 'node:fs';
const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function load(caches){const events={};const context=vm.createContext({self:{addEventListener:(n,cb)=>events[n]=cb,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches,Request});vm.runInContext(source,context);return {events,context};}
test('every offline shell asset exists and cache name is newer than production v19',()=>{
 const {context}=load({});const assets=vm.runInContext('ASSETS',context);
 for(const path of assets){const url=new URL(path==='./'?'../index.html':'../'+path,import.meta.url);assert.ok(existsSync(url)&&statSync(url).size>0,path);}
 assert.notEqual(vm.runInContext('CACHE',context),'synoida-grafo-v19');
});
test('activation deletes only older caches of this app',async()=>{
 const removed=[];const {events}=load({keys:async()=>['synoida-grafo-v19','synoida-grafo-v20-rc1','synoida-grafo-v20-rc2','synoida-grafo-v20-rc3','synoida-grafo-v20-rc4','synoida-grafo-v20-rc5','synoida-grafo-v20','synoida-grafo-v21','synoida-grafo-v22','synoida-grafo-v23','synoida-grafo-v24','synoida-grafo-v25','synoida-grafo-v26','synoida-grafo-v27','synoida-grafo-v28','synoida-grafo-v29','synoida-other-v3','unrelated'],delete:async k=>removed.push(k)});
 let p;events.activate({waitUntil:promise=>p=promise});await p;
 assert.deepEqual(removed,['synoida-grafo-v19','synoida-grafo-v20-rc1','synoida-grafo-v20-rc2','synoida-grafo-v20-rc3','synoida-grafo-v20-rc4','synoida-grafo-v20-rc5','synoida-grafo-v20','synoida-grafo-v21','synoida-grafo-v22','synoida-grafo-v23','synoida-grafo-v24','synoida-grafo-v25','synoida-grafo-v26','synoida-grafo-v27','synoida-grafo-v28']);
});
