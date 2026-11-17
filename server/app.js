import express from 'express';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {questions} from '../src/questions.js';
import {computeProfile,selectAreas,seededShuffle,traits} from '../src/profile.js';
import {logAiFailure} from './ai-errors.js';

const obj=properties=>({type:'object',properties,required:Object.keys(properties)});
const str={type:'string'};const arr=(items,n)=>({type:'array',items,minItems:n,maxItems:n});
const questionSchema=obj({questions:arr(obj({title:{type:'string',minLength:1,maxLength:220},purpose:{type:'string',minLength:1,maxLength:80},options:obj(Object.fromEntries(Object.keys(traits).map(t=>[t,{type:'string',minLength:1,maxLength:120}])))}),5)});
const reportSchema=obj({headline:str,summary:str,strengths:arr(str,3),areas:arr(obj({why:str,activity:str,dayInLife:str,reflection:str}),4),tryNext:arr(str,3),plan:arr(obj({title:str,action:str}),4),uncertainty:str,discussionPrompt:str,note:str});
const band=g=>g<=7?'5–7':g<=10?'8–10':'11–12';
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<3000;
export function createApp({generate,secret=randomBytes(32),logger=console,maxRequests=30,now=Date.now}={}){
 const app=express();app.disable('x-powered-by');const cache=new Map();const limits=new Map();
 app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.use('/api',(req,res,next)=>{
  const key=req.ip;let entry=limits.get(key);if(!entry||entry.until<=now()){entry={count:0,until:now()+60000};limits.set(key,entry);}if(limits.size>2000)limits.delete(limits.keys().next().value);
  if(++entry.count>maxRequests){res.set('Retry-After','60');return res.status(429).json({error:'Too many requests. Your progress is saved; please wait a minute and retry.'});}next();
 });
 app.use(express.json({limit:'32kb'}));
 const sign=payload=>{const body=Buffer.from(JSON.stringify(payload)).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
 function unpack(token){
  if(typeof token!=='string'||token.length>20000)throw Error('Please generate your five questions again.');
  const [body,sig]=token.split('.');const expected=createHmac('sha256',secret).update(body).digest();const actual=Buffer.from(sig||'','base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Your question session is no longer valid. Go back to question 10 and continue to regenerate it.');
  const value=JSON.parse(Buffer.from(body,'base64url').toString());if(value.expires<now())throw Error('Your question session expired. Go back to question 10 and continue.');return value;
 }
 function validate(body,qs=questions){
  const grade=Number(body?.student?.grade);if(!Number.isInteger(grade)||grade<5||grade>12)throw Error('Choose your grade (5–12) before continuing.');
  const input=body?.answers;if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Please complete the questionnaire.');
  const answers={};for(const q of qs){const p=Array.isArray(input[q.id])?input[q.id]:[input[q.id]];if(!p.length||p.length>(q.type==='ranked'?2:1)||new Set(p).size!==p.length||!p.every(a=>q.options.includes(a)))throw Error(`Choose valid answers for ${q.id.toUpperCase()}.`);answers[q.id]=p;}return {grade,answers};
 }
 const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const starterKey=(grade,answers)=>digest({grade,answers:Object.fromEntries(questions.map(q=>[q.id,answers[q.id]]))});
 async function cached(key,work){let item=cache.get(key);if(item&&item.expires>now())return item.promise;const promise=Promise.resolve().then(work);cache.set(key,{expires:now()+30*60000,promise});if(cache.size>100)cache.delete(cache.keys().next().value);try{return await promise;}catch(e){cache.delete(key);throw e;}}
 function fail(stage,error,res){const d=logAiFailure(stage,error,logger);res.status(503).json({error:d.reason,diagnostic:{code:d.code}});}
 app.get('/api/health',(_req,res)=>res.json({ok:true,aiConfigured:Boolean(generate)}));
 app.post('/api/followups',async(req,res)=>{
  let data;try{data=validate(req.body);}catch(e){return res.status(400).json({error:e.message});}
  if(!generate)return res.status(503).json({error:'An AI key must be configured to generate your five questions. Your progress is saved.'});
  const {grade,answers}=data;const key=starterKey(grade,answers);
  try{const result=await cached('questions:'+key,async()=>{
   const profile=computeProfile(answers);
   const raw=await generate(`Create exactly five NEW scenario questions for a student in grades ${band(grade)} based on their anonymous starter answers. Do not repeat or merely rephrase the starter questions. Resolve close interests and uncertainty by exploring concrete choices, not assumed contradictions; maths and art can complement each other. For each scenario supply exactly six distinct plausible actions in an object with keys R, I, A, S, E, C, one for EACH RIASEC interest: R hands-on making, I analysis/investigation, A creativity, S helping/teaching, E leading/persuading, C organising/details. Avoid gender, wealth, ability and sensitive assumptions. Keep options equally appealing, under 100 characters; no option should obviously be the correct answer. Titles must be questions under 220 characters, purpose under 80 characters. Grade 5–7: familiar school/home scenarios and simple words. Grade 8–10: clubs, projects and teamwork. Grade 11–12: realistic project/work/study scenarios without eligibility claims. The student picks a first and optional second choice. Return structured JSON only. Interest clues: ${JSON.stringify(profile.uncertainty)}. Anonymous choices: ${JSON.stringify(questions.map(q=>({id:q.id,question:q.title,answer:answers[q.id]})))}`,questionSchema);
   if(!Array.isArray(raw.questions)||raw.questions.length!==5)throw Error('Invalid questions');
   const seed=randomBytes(16).toString('hex');
   const bank=raw.questions.map((q,i)=>{
    const tagged=Object.keys(traits).map(trait=>({trait,text:q.options?.[trait]}));
    if(!text(q.title)||q.title.length>220||!text(q.purpose)||q.purpose.length>80||!tagged.every(o=>text(o.text)&&o.text.length<=120)||new Set(tagged.map(o=>o.text)).size!==6)throw Error('Invalid questions');
    const options=seededShuffle(tagged,seed+i);return {id:`f${i+1}`,title:q.title,purpose:q.purpose,type:'ranked',options:options.map(o=>o.text),optionTraits:options.map(o=>o.trait)};
   });return {questions:bank,profile,source:'ai',questionToken:sign({bank,key,expires:now()+24*60*60000})};
  });res.json(result);}catch(e){fail('followups',e,res);}
 });
 app.post('/api/report',async(req,res)=>{
  let pack,data;try{pack=unpack(req.body?.questionToken);data=validate(req.body,[...questions,...pack.bank]);if(pack.key!==starterKey(data.grade,data.answers))throw Error('Your starter answers changed. Go back to question 10 to regenerate the follow-ups.');}catch(e){return res.status(400).json({error:e.message});}
  if(!generate)return res.status(503).json({error:'An AI key must be configured to generate your report. Your answers are saved.'});
  const {grade,answers}=data;const evidence=[...questions,...pack.bank].map(q=>({id:q.id,question:q.title,answer:answers[q.id]}));
  try{const result=await cached('report:'+digest({grade,answers,bank:pack.bank}),async()=>{
   const profile=computeProfile(answers,pack.bank);const areas=selectAreas(profile,grade);
   const w=await generate(`Write an encouraging report for grades ${band(grade)} using the supplied anonymous answers and code-computed profile. Return four area descriptions in exactly the supplied order; do not change the selected areas. Ground each explanation in the actual choices. Do not infer ability or invent experiences. The scores are opportunity-normalised editorial interests, not validated aptitude measurements. Broad or sparse profile: ${profile.broad||profile.sparse}; if true, clearly say no strong preference stands out and call areas experiments, never confident matches. The last area is a wildcard. Mixed interests can complement each other. Grade 5–7: short sentences, activities and familiar words; no career/degree names anywhere in writing. Grade 8–10: careers as examples and practical projects. Grade 11–12: realistic exploration and broad degree routes; no exams/eligibility without country/curriculum. Include one safe project per area using ordinary materials, a brief day-in-the-life/activity snapshot, one reflection question, three tentative strengths, three next actions, and four weekly actions with tangible outputs. Do not rule out careers, give percent predictions or salaries. Keep total output under 750 words, IDs out of prose. Areas: ${JSON.stringify(areas)}. Profile: ${JSON.stringify(profile)}. Answers: ${JSON.stringify(evidence)}`,reportSchema);
   for(const k of ['headline','summary','uncertainty','discussionPrompt','note'])if(!text(w[k]))throw Error('Incomplete report');
   for(const [k,n]of [['strengths',3],['tryNext',3]])if(!Array.isArray(w[k])||w[k].length!==n||!w[k].every(text))throw Error('Incomplete report');
   if(!Array.isArray(w.plan)||w.plan.length!==4||!w.plan.every(p=>text(p.title)&&text(p.action)))throw Error('Incomplete plan');
   if(!Array.isArray(w.areas)||w.areas.length!==4||!w.areas.every(a=>['why','activity','dayInLife','reflection'].every(k=>text(a[k]))))throw Error('Incomplete report');
   return {source:'ai',profile,evidence,report:{...w,gradeBand:band(grade),explorationOnly:grade<=7,areas:areas.map((a,i)=>({...a,why:w.areas[i].why,activity:w.areas[i].activity,dayInLife:w.areas[i].dayInLife,reflection:w.areas[i].reflection}))}};
  });res.json(result);}catch(e){fail('report',e,res);}
 });
 app.use((err,_req,res,_next)=>res.status(err.type==='entity.too.large'?413:400).json({error:err.type==='entity.too.large'?'Request is too large.':'Invalid request format.'}));
 return app;
}
