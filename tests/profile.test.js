import test from 'node:test';
import assert from 'node:assert/strict';
import {questions} from '../src/questions.js';
import {optionTags,computeProfile,questionBank,selectAreas,maximumScores,seededShuffle} from '../src/profile.js';
test('every option has an explicit valid tag or a neutral mapping',()=>{
 for(const q of questions){assert.equal(optionTags[q.id].length,q.options.length);assert.ok(optionTags[q.id].every(t=>/^[RIASEC]*$/.test(t)));}
});
test('ranking is deterministic and first choice weighs twice the second',()=>{
 const a=computeProfile({q1:[questions[0].options[0],questions[0].options[2]]});
 assert.equal(a.rawScores.I,2);assert.equal(a.rawScores.A,1);
 assert.deepEqual(a,computeProfile({q1:[questions[0].options[0],questions[0].options[2]]}));
 const b=computeProfile({q1:[questions[0].options[2],questions[0].options[0]]});assert.equal(b.rawScores.A,2);assert.equal(b.rawScores.I,1);
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


test('normalised theoretical maximum is 100 for every trait across all 15 questions',()=>{
 const bank=questionBank();const all=[...questions,...bank];const max=maximumScores(bank);
 assert.ok(new Set(Object.values(max)).size>1, 'raw opportunity differs and needs normalisation');
 for(const trait of ['R','I','A','S','E','C']){
  const answers={};for(const q of all){const tagged=q.options.map((option,i)=>{const tags=q.id.startsWith('q')?optionTags[q.id][i]:q.optionTraits[i];return {option,weight:tags.includes(trait)?1/tags.length:0};}).sort((a,b)=>b.weight-a.weight);answers[q.id]=tagged.slice(0,q.type==='ranked'?2:1).map(x=>x.option);}
  assert.ok(Math.abs(computeProfile(answers,bank).scores[trait]-100)<0.00001);
 }
});
test('split points conserve the rank budget and absolute bars do not amplify weak answers',()=>{
 const p=computeProfile({q1:[questions[0].options[1]]});assert.equal(p.rawScores.R,1);assert.equal(p.rawScores.I,1);assert.equal(Object.values(p.rawScores).reduce((a,b)=>a+b,0),2);assert.ok(Math.max(...Object.values(p.visual))<15);assert.equal(p.sparse,true);
 const empty=computeProfile({});assert.equal(empty.broad,true);assert.ok(Object.values(empty.visual).every(x=>x===0));
});
test('seeded option shuffles are repeatable, vary by seed and preserve membership',()=>{
 const options=['R','I','A','S','E','C'];assert.deepEqual(seededShuffle(options,'one'),seededShuffle(options,'one'));assert.notDeepEqual(seededShuffle(options,'one'),seededShuffle(options,'two'));assert.deepEqual([...seededShuffle(options,'one')].sort(),[...options].sort());assert.deepEqual(options,['R','I','A','S','E','C']);
});
