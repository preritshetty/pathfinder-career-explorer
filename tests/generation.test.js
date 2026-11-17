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
