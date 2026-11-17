import test from 'node:test';
import assert from 'node:assert/strict';
import {presentConnections,hasDistinctOverview} from '../src/report-presentation.js';
test('bare model IDs become the actual selected answers, never invented explanations',()=>{
 const evidence=[{id:'q1',answer:['English','Social studies']},{id:'f10',answer:['Help the group']}];
 assert.deepEqual(presentConnections(['q1','F10','This area connects with your interest in teaching.'],evidence),['Q1: You selected English; Social studies.','F10: You selected Help the group.','This area connects with your interest in teaching.']);
 assert.deepEqual(presentConnections(['q999'],evidence),[]);
});
test('a repeated section title is not shown as an explanatory paragraph',()=>{
 assert.equal(hasDistinctOverview('Academic Interests!','Academic interests'),false);
 assert.equal(hasDistinctOverview('You enjoy languages and discussing ideas.','Academic interests'),true);
});
