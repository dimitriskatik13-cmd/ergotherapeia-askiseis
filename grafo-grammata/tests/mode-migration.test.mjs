import test from 'node:test';
import assert from 'node:assert/strict';
test('saved Gradual mode migrates to Follow without losing therapist preferences',async()=>{
 globalThis.localStorage={getItem:()=>JSON.stringify({mode:'fading',helpLevel:3,strictness:.25,pressure:true,currentChar:'β'})};
 const {store}=await import('../js/state.js?legacy-mode-test');
 assert.equal(store.get('mode'),'trace');assert.equal(store.get('helpLevel'),undefined);
 assert.equal(store.get('strictness'),.25);assert.equal(store.get('pressure'),true);assert.equal(store.get('currentChar'),'β');
});
