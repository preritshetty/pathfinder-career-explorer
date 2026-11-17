import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSession,saveSession,SESSION_KEY} from '../src/session.js';
test('session refresh persistence, old versions and blocked storage',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const value={stage:'base',index:2,student:{grade:'7'},answers:{q1:['A']}};
 assert.equal(saveSession(value,storage),true);assert.equal(loadSession(storage).index,2);
 map.set(SESSION_KEY,'invalid');assert.equal(loadSession(storage),null);
 map.set(SESSION_KEY,JSON.stringify({...value,version:1}));assert.equal(loadSession(storage),null);
 const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};assert.equal(loadSession(blocked),null);assert.equal(saveSession(value,blocked),false);
});
