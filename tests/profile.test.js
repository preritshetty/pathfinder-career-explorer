import test from 'node:test';
import assert from 'node:assert/strict';
import {questions} from '../src/questions.js';
import {STARTER_COUNT,FOLLOWUP_COUNT,TOTAL_COUNT,sections} from '../src/config.js';
import {optionTags,computeProfile,selectAreas,maximumScores,seededShuffle} from '../src/profile.js';
import {generatedQuestions} from './fixtures.js';
const bank=generatedQuestions.questions.map((q,i)=>({id:`f${i+1}`,options:Object.values(q.options),optionTraits:Object.keys(q.options),type:'ranked'}));
test('all 30 source questions have explicit option tags and six sections',()=>{
 assert.equal(STARTER_COUNT,30);assert.equal(FOLLOWUP_COUNT,10);assert.equal(TOTAL_COUNT,40);assert.equal(sections.length,6);
 for(const q of questions){assert.equal(optionTags[q.id].length,q.options.length,q.id);assert.ok(optionTags[q.id].every(t=>/^[RIASEC]*$/.test(t)));assert.equal(q.type,'multi');}
});
test('starter multi-select is unordered and conserves the per-question point budget',()=>{
 const picks=[questions[0].options[0],questions[0].options[5],questions[0].options[6]];
 const a=computeProfile({q1:picks});assert.deepEqual(a,computeProfile({q1:[...picks].reverse()}));
 assert.ok(Math.abs(Object.values(a.rawScores).reduce((a,b)=>a+b,0)-2)<0.00001);
});
test('AI follow-up ranks give first choice twice the weight of second',()=>{
 const p=computeProfile({f1:[bank[0].options[0],bank[0].options[1]]},bank);assert.equal(p.rawScores.R,2);assert.equal(p.rawScores.I,1);
});
test('neutral preferences and free text do not imply measured ability or interests',()=>{
 const p=computeProfile({q3:[questions[2].options[0]],q21:[questions[20].options[9]],q25:[questions[24].options[4]],q30:[questions[29].options[6]],q9_detail:'I am a scientist'});
 assert.ok(Object.values(p.scores).every(n=>n===0));assert.equal(p.answered,0);assert.equal(p.uncertainty.unsureQuestions.length,3);
});
test('normalised theoretical maximum is 100 for each trait over 40 questions',()=>{
 const max=maximumScores(bank);assert.ok(new Set(Object.values(max)).size>1);
 for(const trait of ['R','I','A','S','E','C']){
  const answers={};for(const q of [...questions,...bank]){const tagged=q.options.map((option,i)=>{const tags=q.id.startsWith('q')?optionTags[q.id][i]:q.optionTraits[i];return {option,weight:tags.includes(trait)?1/tags.length:0};}).sort((a,b)=>b.weight-a.weight);answers[q.id]=tagged.slice(0,q.type==='ranked'?2:1).map(x=>x.option);}
  assert.ok(Math.abs(computeProfile(answers,bank).scores[trait]-100)<0.00001,trait);
 }
});
test('flat profiles and seed shuffling are stable; grade routes and wildcard remain distinct',()=>{
 const empty=computeProfile({});assert.equal(empty.broad,true);assert.equal(empty.sparse,true);assert.ok(Object.values(empty.visual).every(x=>x===0));
 const options=['R','I','A','S','E','C'];assert.deepEqual(seededShuffle(options,'one'),seededShuffle(options,'one'));assert.notDeepEqual(seededShuffle(options,'one'),seededShuffle(options,'two'));
 const areas=selectAreas(empty,12);assert.equal(areas.length,4);assert.equal(new Set(areas.map(a=>a.trait)).size,4);assert.equal(areas[3].wildcard,true);assert.ok(areas.every(a=>a.degrees.length));assert.ok(selectAreas(empty,6).every(a=>a.degrees.length===0));
});
