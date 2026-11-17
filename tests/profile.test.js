import test from 'node:test';
import assert from 'node:assert/strict';
import {questions} from '../src/questions.js';
import {optionTags,computeProfile,questionBank,selectAreas} from '../src/profile.js';
test('every option has an explicit valid tag or a neutral mapping',()=>{
 for(const q of questions){assert.equal(optionTags[q.id].length,q.options.length);assert.ok(optionTags[q.id].every(t=>/^[RIASEC]*$/.test(t)));}
});
test('ranking is deterministic and first choice weighs twice the second',()=>{
 const a=computeProfile({q1:[questions[0].options[0],questions[0].options[2]]});
 assert.equal(a.scores.I,2);assert.equal(a.scores.A,1);
 assert.deepEqual(a,computeProfile({q1:[questions[0].options[0],questions[0].options[2]]}));
 const b=computeProfile({q1:[questions[0].options[2],questions[0].options[0]]});assert.equal(b.scores.A,2);assert.equal(b.scores.I,1);
});
test('neutral choices and free text do not imply interests',()=>{
 const p=computeProfile({q6:questions[5].options[7],q8:questions[7].options[7],q10:questions[9].options[3],q9_detail:'I am a scientist'});
 assert.ok(Object.values(p.scores).every(n=>n===0));assert.equal(p.answered,0);assert.equal(p.uncertainty.unsureQuestions.length,3);
});
test('scenario options preserve tags and four stable areas include distinct wildcard',()=>{
 const p=computeProfile({q1:[questions[0].options[0]]});const bank=questionBank(p);
 assert.equal(bank.length,5);for(const q of bank){assert.equal(q.options.length,6);assert.equal(new Set(q.optionTraits).size,6);}
 const areas=selectAreas(p,12);assert.equal(areas.length,4);assert.equal(new Set(areas.map(a=>a.trait)).size,4);assert.equal(areas[3].wildcard,true);
 assert.ok(areas.every(a=>a.degrees.length));assert.ok(selectAreas(p,6).every(a=>a.degrees.length===0));
});
