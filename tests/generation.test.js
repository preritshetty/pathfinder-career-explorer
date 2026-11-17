import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerator} from '../server/generation.js';
import {reportSchema} from '../server/report-schema.js';
test('overload gets one bounded AI fallback and records the actual model',async()=>{
 const calls=[];const ai={models:{generateContent:async req=>{calls.push(req);if(calls.length===1)throw {status:503};return {text:'{"result":"ok"}'};}}};
 const result=await createGenerator(ai,{model:'gemini-3.5-flash-lite',fallbackModel:'gemini-3.8-flash',sleep:async()=>{}})('test',{properties:{titles:{}}});
 assert.equal(calls.length,2);assert.equal(calls[1].model,'gemini-3.8-flash');assert.equal(result._model,'gemini-3.8-flash');
});
test('quota retry stays on the configured model instead of switching projects or keys',async()=>{
 const models=[];const ai={models:{generateContent:async req=>{models.push(req.model);throw {status:429};}}};
 await assert.rejects(()=>createGenerator(ai,{model:'primary',sleep:async()=>{}})('test',{properties:{}}));assert.deepEqual(models,['primary','primary']);
});
test('detailed reports use JSON mode with explicit shape instructions and strict local validation',async()=>{
 let request;const ai={models:{generateContent:async req=>{request=req;return {text:'{"headline":"ok"}'};}}};
 await createGenerator(ai,{model:'primary'})('Write report',reportSchema);
 assert.equal(request.config.responseMimeType,'application/json');assert.equal(request.config.responseJsonSchema,undefined);assert.match(request.contents,/dimensions/);assert.match(request.contents,/exactly 6 entries/);
});

test('a model-generated correction repairs invalid question content before returning it',async()=>{
 const {generatedQuestions}=await import('./fixtures.js');
 const {questionSchema,validateGeneratedQuestions}=await import('../server/question-contract.js');
 const calls=[],delays=[];
 const ai={models:{generateContent:async req=>{calls.push(req);return {text:JSON.stringify(calls.length===1?{questions:[]}:generatedQuestions)};}}};
 const result=await createGenerator(ai,{model:'primary',sleep:async ms=>delays.push(ms),random:()=>0})('Make questions',questionSchema,{validate:validateGeneratedQuestions});
 assert.equal(result.questions.length,10);assert.equal(result._attempts,2);assert.match(calls[1].contents,/previous response failed validation/);assert.match(calls[1].contents,/exactly 10/);assert.deepEqual(delays,[2000]);
});
test('persistent invalid AI output is never replaced with static content',async()=>{
 const {questionSchema,validateGeneratedQuestions}=await import('../server/question-contract.js');let calls=0;
 const ai={models:{generateContent:async()=>{calls++;return {text:'{"questions":[]}'};}}};
 await assert.rejects(()=>createGenerator(ai,{model:'primary',sleep:async()=>{}})('Make questions',questionSchema,{validate:validateGeneratedQuestions}),/Invalid questions/);
 assert.equal(calls,2);
});
test('temporary errors use bounded exponential backoff without echoing raw error text',async()=>{
 let calls=0;const delays=[];
 const ai={models:{generateContent:async()=>{calls++;throw {status:503,message:'PRIVATE_ERROR_PAYLOAD'};}}};
 await assert.rejects(()=>createGenerator(ai,{model:'primary',sleep:async n=>delays.push(n),random:()=>0})('test',{properties:{}}));assert.equal(calls,3);assert.deepEqual(delays,[2000,4000]);
});
test('fenced JSON can be read but non-JSON content must be regenerated',async()=>{
 const ai={models:{generateContent:async()=>({text:'```json\n{"ok":true}\n```'})}};
 assert.equal((await createGenerator(ai,{model:'primary'})('test',{properties:{}})).ok,true);
});
test('network errors are retried even when the error also has a generic name',async()=>{
 let calls=0;const ai={models:{generateContent:async()=>{if(++calls===1)throw new Error('fetch failed');return {text:'{"ok":true}'};}}};
 const value=await createGenerator(ai,{model:'primary',sleep:async()=>{}})('test',{properties:{}});assert.equal(value.ok,true);assert.equal(calls,2);
});
