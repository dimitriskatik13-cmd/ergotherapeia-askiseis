import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS, normalizeSettings} from '../js/state.js';
import {lettersByCase} from '../js/letters/index.js';

test('stored target corruption recovers to valid targets and current character',()=>{
  const cases=[{},true,[],['bogus'],['β','bogus','β'],['Α']];
  for(const targets of cases){
    const data=normalizeSettings({targetLetters:targets,currentChar:'bad'});
    assert.ok(data.targetLetters===null||data.targetLetters.every(c=>lettersByCase(data.case).some(l=>l.char===c)));
    assert.ok((data.targetLetters||lettersByCase(data.case).map(l=>l.char)).includes(data.currentChar));
  }
  assert.deepEqual(normalizeSettings({targetLetters:['β','bogus','β'],currentChar:'α'}).targetLetters,['β']);
  assert.equal(normalizeSettings({targetLetters:['β'],currentChar:'α'}).currentChar,'β');
});
test('only whitelisted keys, types and enums survive while valid preferences remain',()=>{
  const good={case:'numbers',currentChar:'17',targetLetters:['17','31'],mode:'free',strictness:.23,penWidth:.025,pressure:true,penOnly:true,letterSize:.91,lines:'none',animSpeed:.17,hand:'left'};
  assert.deepEqual(normalizeSettings({...good,helpLevel:3,privateField:'remove'}),good);
  const invalid={case:'bad',mode:'bad',lines:'bad',hand:'bad',pressure:'true',penOnly:1,letterSize:'bad',penWidth:null,strictness:NaN,animSpeed:Infinity};
  assert.deepEqual(normalizeSettings(invalid),DEFAULTS);
  for(const value of [null,17,[],true,'bad'])assert.deepEqual(normalizeSettings(value),DEFAULTS);
});
test('finite settings are bounded and category-specific targets are filtered',()=>{
  const low=normalizeSettings({strictness:-9,penWidth:-1,letterSize:-10,animSpeed:-3});
  assert.equal(low.strictness,0);assert.equal(low.penWidth,.008);assert.equal(low.letterSize,0);assert.equal(low.animSpeed,0);
  const high=normalizeSettings({strictness:9,penWidth:2,letterSize:10,animSpeed:3});
  assert.equal(high.strictness,1);assert.equal(high.penWidth,.034);assert.equal(high.letterSize,1);assert.equal(high.animSpeed,1);
  const upper=normalizeSettings({case:'upper',targetLetters:['β','Β'],currentChar:'β'});
  assert.deepEqual(upper.targetLetters,['Β']);assert.equal(upper.currentChar,'Β');
  const numbers=normalizeSettings({case:'numbers',targetLetters:[17,'17','32'],currentChar:'31'});
  assert.deepEqual(numbers.targetLetters,['17']);assert.equal(numbers.currentChar,'17');
});
test('load recovers malformed/storage-read failures, preserves legacy migration and persists normalized updates',async()=>{
  const saved=[];let count=0;
  for(const raw of ['{bad',JSON.stringify({mode:'fading',helpLevel:3,currentChar:'β',strictness:.25,pressure:true}),JSON.stringify({targetLetters:{}})]){
    globalThis.localStorage={getItem:()=>raw,setItem:(_,value)=>saved.push(JSON.parse(value))};
    const {store}=await import('../js/state.js?recovery='+count++);
    assert.equal(store.get('mode'),'trace');assert.equal(store.get('helpLevel'),undefined);
    if(raw.includes('fading')){assert.equal(store.get('currentChar'),'β');assert.equal(store.get('strictness'),.25);assert.equal(store.get('pressure'),true);}
    store.update({letterSize:NaN,penWidth:-5,mode:'invalid',targetLetters:[],currentChar:'bad'});
    assert.equal(store.get('penWidth'),.008);assert.equal(store.get('targetLetters'),null);assert.equal(store.get('currentChar'),'α');assert.equal(store.get('mode'),'trace');assert.equal(store.get('letterSize'),DEFAULTS.letterSize);
  }
  assert.equal(saved.length,3);
  globalThis.localStorage={getItem(){throw Error('storage denied')},setItem(){throw Error('quota')}};
  const {store}=await import('../js/state.js?denied');assert.deepEqual(store.all(),DEFAULTS);assert.doesNotThrow(()=>store.set('hand','left'));assert.equal(store.get('hand'),'left');
});
