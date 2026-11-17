import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {questions} from '../src/questions.js';
import {fixtureGenerate} from './fixtures.js';
const starter=()=>Object.fromEntries(questions.map(q=>[q.id,[q.options[0]]]));
async function withServer(options,work){const server=createApp(options).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}`;const post=async(route,body,raw=false)=>{const r=await fetch(url+route,{method:'POST',headers:{'content-type':'application/json'},body:raw?body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};try{await work(post);}finally{await new Promise(r=>server.close(r));}}
test('bad payloads, body limit and incomplete reports are rejected',async()=>withServer({generate:fixtureGenerate},async post=>{
 for(const body of [{},{answers:starter(),student:{grade:4}},{answers:[],student:{grade:7}},{answers:{...starter(),q1:['not an option']},student:{grade:7}}])assert.equal((await post('/api/followups',body)).status,400);
 assert.equal((await post('/api/followups','{invalid',true)).status,400);
 assert.equal((await post('/api/followups',{padding:'x'.repeat(40000)})).status,413);
 assert.equal((await post('/api/report',{student:{grade:7},answers:starter()})).status,400);
}));
test('signed AI questions, duplicate coalescing, report caching and privacy',async()=>{
 const logs=[],prompts=[];let calls=0;
 await withServer({generate:async(p,s)=>{calls++;prompts.push(p);return fixtureGenerate(p,s);},logger:{warn:x=>logs.push(x)}},async post=>{
  const body={student:{grade:7,name:'PRIVATE_NAME'},answers:{...starter(),q10_detail:'PRIVATE_NOTE'},school:'PRIVATE_SCHOOL'};
  const [a,b]=await Promise.all([post('/api/followups',body),post('/api/followups',body)]);assert.equal(a.status,200);assert.equal(calls,1);assert.deepEqual(a.data.questions,b.data.questions);assert.equal(a.data.generation.cacheHit,false);assert.equal(b.data.generation.cacheHit,true);assert.equal(a.data.source,'ai');
  const answers=starter();for(const q of a.data.questions)answers[q.id]=[q.options[0],q.options[1]];
  const request={student:{grade:7},answers,questionToken:a.data.questionToken};
  const r=await post('/api/report',request);assert.equal(r.status,200);assert.equal(r.data.report.explorationOnly,true);assert.equal(r.data.report.areas.length,4);
  const cached=await post('/api/report',request);assert.deepEqual(cached.data.report,r.data.report);assert.equal(cached.data.generation.cacheHit,true);assert.equal(r.data.generation.cacheHit,false);assert.equal(calls,2);
  assert.equal((await post('/api/report',{...request,questionToken:a.data.questionToken+'invalid'})).status,400);
  assert.equal((await post('/api/report',{...request,answers:{...answers,q1:[questions[0].options[1]]}})).status,400);
  for(const secret of ['PRIVATE_NAME','PRIVATE_NOTE','PRIVATE_SCHOOL']){assert.ok(!prompts.join('').includes(secret));assert.ok(!logs.join('').includes(secret));}
 });
});
test('AI outages and malformed output preserve a retry path without fake AI content',async()=>{
 const logs=[];
 for(const error of [{status:429,message:'PRIVATE_ANSWER quota'},new Error('PRIVATE_ANSWER fetch failed')])await withServer({generate:async()=>{throw error;},logger:{warn:x=>logs.push(x)}},async post=>{
  const r=await post('/api/followups',{student:{grade:7},answers:starter()});assert.equal(r.status,503);assert.ok(!r.data.questions);assert.match(r.data.error,/saved/);
 });
 await withServer({generate:async()=>({questions:[]}),logger:{warn:x=>logs.push(x)}},async post=>assert.equal((await post('/api/followups',{student:{grade:7},answers:starter()})).data.diagnostic.code,'AI_FORMAT'));
 assert.ok(!logs.join('').includes('PRIVATE_ANSWER'));
});
test('report errors are logged without answers, payloads or SDK details',async()=>{
 const logs=[];let calls=0;
 await withServer({generate:async(p,s)=>{if(++calls===1)return fixtureGenerate(p,s);throw {status:503,message:'PRIVATE_KEY PRIVATE_ANSWER'};},logger:{warn:x=>logs.push(x)}},async post=>{
  const q=(await post('/api/followups',{student:{grade:12},answers:starter()})).data;const answers=starter();for(const item of q.questions)answers[item.id]=[item.options[0]];
  const r=await post('/api/report',{student:{grade:12},answers,questionToken:q.questionToken});assert.equal(r.status,503);assert.equal(r.data.diagnostic.code,'AI_BUSY');assert.ok(!r.data.report);assert.ok(!JSON.stringify(r).includes('PRIVATE_'));
 });assert.equal(logs.length,1);assert.ok(!logs.join('').includes('PRIVATE_'));
});
test('rate limits return 429',async()=>withServer({generate:fixtureGenerate,maxRequests:1},async post=>{
 await post('/api/followups',{});assert.equal((await post('/api/followups',{})).status,429);
}));
