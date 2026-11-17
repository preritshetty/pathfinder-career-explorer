import express from 'express';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {questions} from '../src/questions.js';
import {STARTER_COUNT,FOLLOWUP_COUNT,TOTAL_COUNT,sections,SURVEY_VERSION} from '../src/config.js';
import {reportSchema,validateReport} from './report-schema.js';
import {questionSchema,validateGeneratedQuestions} from './question-contract.js';
import {computeProfile,selectAreas,seededShuffle,traits} from '../src/profile.js';
import {logAiFailure} from './ai-errors.js';

const band=g=>g<=7?'5–7':g<=10?'8–10':'11–12';
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<3000;
export function createApp({generate,secret=randomBytes(32),logger=console,maxRequests=30,now=Date.now}={}){
 const app=express();app.disable('x-powered-by');const cache=new Map();const limits=new Map();
 app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.use('/api',(req,res,next)=>{
  const key=req.ip;let entry=limits.get(key);if(!entry||entry.until<=now()){entry={count:0,until:now()+60000};limits.set(key,entry);}if(limits.size>2000)limits.delete(limits.keys().next().value);
  if(++entry.count>maxRequests){res.set('Retry-After','60');return res.status(429).json({error:'Too many requests. Your progress is saved; please wait a minute and retry.'});}next();
 });
 app.use(express.json({limit:'96kb'}));
 const sign=payload=>{const body=Buffer.from(JSON.stringify(payload)).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
 function unpack(token){
  if(typeof token!=='string'||token.length>50000)throw Error('Please generate your ten questions again.');
  const [body,sig]=token.split('.');const expected=createHmac('sha256',secret).update(body).digest();const actual=Buffer.from(sig||'','base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Your question session is no longer valid. Go back to question 30 and continue to regenerate it.');
  const value=JSON.parse(Buffer.from(body,'base64url').toString());if(value.expires<now())throw Error('Your question session expired. Go back to question 30 and continue.');return value;
 }
 function validate(body,qs=questions){
  const grade=Number(body?.student?.grade);if(!Number.isInteger(grade)||grade<5||grade>12)throw Error('Choose your grade (5–12) before continuing.');
  const input=body?.answers;if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Please complete the questionnaire.');
  const answers={};for(const q of qs){const p=Array.isArray(input[q.id])?input[q.id]:[input[q.id]];if(!p.length||p.length>(q.type==='multi'?q.options.length:q.type==='ranked'?2:1)||new Set(p).size!==p.length||!p.every(a=>q.options.includes(a)))throw Error(`Choose valid answers for ${q.id.toUpperCase()}.`);answers[q.id]=p;}return {grade,answers};
 }
 const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const starterKey=(grade,answers)=>digest({version:SURVEY_VERSION,grade,answers:Object.fromEntries(questions.map(q=>[q.id,answers[q.id]]))});
 async function cached(key,work){
  let item=cache.get(key);const cacheHit=Boolean(item&&item.expires>now());
  if(!cacheHit){item={created:now(),expires:now()+30*60000,promise:null};item.promise=Promise.resolve().then(work).then(value=>{item.generatedAt=now();return value;});cache.set(key,item);if(cache.size>100)cache.delete(cache.keys().next().value);}
  try{const value=await item.promise;return {...value,generation:{provider:'gemini',model:value.modelUsed,attempts:value.attempts,cacheHit,generatedAt:new Date(item.generatedAt).toISOString()}};}catch(e){cache.delete(key);throw e;}
 }
 function fail(stage,error,res){const d=logAiFailure(stage,error,logger);res.status(503).json({error:d.reason,diagnostic:{code:d.code}});}
 app.get('/api/health',(_req,res)=>res.json({ok:true,aiConfigured:Boolean(generate)}));
 app.post('/api/followups',async(req,res)=>{
  let data;try{data=validate(req.body);}catch(e){return res.status(400).json({error:e.message});}
  if(!generate)return res.status(503).json({error:'An AI key must be configured to generate your ten questions. Your progress is saved.'});
  const {grade,answers}=data;const key=starterKey(grade,answers);
  try{const result=await cached('questions:'+key,async()=>{
   const profile=computeProfile(answers);
   const raw=await generate(`Create exactly ten NEW scenario questions for a student in grades ${band(grade)} based on their anonymous starter answers from all six sections. Do not repeat or merely rephrase the starter questions. Resolve close interests and uncertainty by exploring concrete choices, not assumed contradictions; maths and art can complement each other. For each scenario supply exactly six distinct plausible actions in an object with keys R, I, A, S, E, C, one for EACH RIASEC interest: R hands-on making, I analysis/investigation, A creativity, S helping/teaching, E leading/persuading, C organising/details. Avoid gender, wealth, ability and sensitive assumptions. Keep options equally appealing, under 100 characters; no option should obviously be the correct answer. Titles must be questions under 220 characters, purpose under 80 characters. Grade 5–7: familiar school/home scenarios and simple words. Grade 8–10: clubs, projects and teamwork. Grade 11–12: realistic project/work/study scenarios without eligibility claims. The student picks a first and optional second choice in the follow-ups; starter answers are unordered multiple selections. Cover learning strategies, collaboration, decision-making, values, uncertainty, interests and practical problem-solving across the ten scenarios. Return structured JSON only. Interest clues: ${JSON.stringify(profile.uncertainty)}. Anonymous choices: ${JSON.stringify(questions.map(q=>({id:q.id,question:q.title,answer:answers[q.id]})))}`,questionSchema,{validate:validateGeneratedQuestions});
   validateGeneratedQuestions(raw);
   const seed=randomBytes(16).toString('hex');
   const bank=raw.questions.map((q,i)=>{
    const tagged=Object.keys(traits).map(trait=>({trait,text:q.options?.[trait]}));
    const options=seededShuffle(tagged,seed+i);return {id:`f${i+1}`,title:q.title,purpose:q.purpose,type:'ranked',options:options.map(o=>o.text),optionTraits:options.map(o=>o.trait)};
   });return {questions:bank,profile,source:'ai',modelUsed:raw._model,attempts:raw._attempts,questionToken:sign({bank,key,expires:now()+24*60*60000})};
  });res.json(result);}catch(e){fail('followups',e,res);}
 });
 app.post('/api/report',async(req,res)=>{
  let pack,data;try{pack=unpack(req.body?.questionToken);data=validate(req.body,[...questions,...pack.bank]);if(pack.key!==starterKey(data.grade,data.answers))throw Error('Your starter answers changed. Go back to question 30 to regenerate the follow-ups.');}catch(e){return res.status(400).json({error:e.message});}
  if(!generate)return res.status(503).json({error:'An AI key must be configured to generate your report. Your answers are saved.'});
  const {grade,answers}=data;const evidence=[...questions,...pack.bank].map(q=>({id:q.id,question:q.title,answer:answers[q.id]}));
  try{const result=await cached('report:'+digest({grade,answers,bank:pack.bank}),async()=>{
   const profile=computeProfile(answers,pack.bank);const areas=selectAreas(profile,grade);
   const w=await generate(`Write a detailed Career Discovery Report for grades ${band(grade)} based on ALL ${TOTAL_COUNT} anonymous answers. This is a substantial report of approximately 2500–4000 words, using concrete observations and useful explanation rather than repetition. The report must contain: framework/overview; orientation; six questionnaire-dimension interpretations; six RIASEC interest interpretations; learning preferences and experiments; working/problem-solving/decision preferences; career awareness and values; four in-depth career dossiers; skills development; four-week plan; parent/teacher guidance; institution/course research checklist; assessment limitations. The code-selected career areas are fixed: describe them in order, do not substitute them. Career dossiers need a specific answer-based explanation, realistic daily tasks, 5 skill areas, 5 example roles, 3 broad study routes or age-appropriate learning routes, a 4-step project with a tangible output and duration, 3 evidence connections, 2 unresolved questions, and 3 next steps. Six dimensions correspond in exact order to ${JSON.stringify(sections)}. Six traitDetails correspond in exact order to ${JSON.stringify(Object.entries(traits))}. Give meaning, interpretation, and development suggestions for each trait. Follow these exact counts: dimensions 6, traitDetails 6, areas 4, developmentPlan 4, plan 4, strengths 3, tryNext 3; each nested array must follow its schema description. Valid evidence IDs are q1 through q30 and f1 through f10, never q31 or higher. Cite only valid answered question IDs in evidenceIds. Treat the answers as self-reports, not demonstrated ability; explain when evidence is weak or mixed. These questions DO NOT measure IQ, aptitude, emotional quotient, clinical/personality scores, resilience, integrity or mental health. The limitations section must explicitly say aptitude and emotional quotient are not assessed; never fabricate scores, percentiles, career-match percentages, diagnoses, deficits, psychometric validation or 'expert-certified' claims. RIASEC values are opportunity-normalised editorial interest indicators, not aptitude. Broad or sparse profile: ${profile.broad||profile.sparse}; if true say no clear single lead and frame areas as experiments. The fourth area is a wildcard. Grade 5–7: detailed but simple, supportive activity-oriented language; role and study fields should describe things to explore, not career decisions. Grade 8–10: skills, experiences and broad subjects. Grade 11–12: more concrete broad degree/vocational families and research steps; no current entrance exams, fees, admission eligibility, salaries, rankings, named institutions or employment guarantees because region/curriculum is unknown and these facts are not verified. EducationResearch should explain how to check official course pages with a counsellor. Never exclude a path. Do not claim a preference is unknown if a student stated it. Every paragraph should add insight or an action. Dimension overviews must explain the response pattern in two or more sentences, never repeat the heading. Use at least 12 words for every trait interpretation and career explanation, and 15 words for every daily-work snapshot. Career connections must be full sentences explaining a selected preference, not bare question IDs. Keep question IDs in evidenceIds only, not prose. Areas: ${JSON.stringify(areas)}. Profile: ${JSON.stringify(profile)}. Anonymous answers: ${JSON.stringify(evidence)}`,reportSchema,{validate:value=>validateReport(value,evidence)});
   validateReport(w,evidence);
   return {source:'ai',modelUsed:w._model,attempts:w._attempts,profile,evidence,report:{...w,gradeBand:band(grade),explorationOnly:grade<=7,sections,questionCount:TOTAL_COUNT,areas:areas.map((a,i)=>({...a,...w.areas[i],trait:a.trait,title:a.title,wildcard:a.wildcard,evidenceIds:a.evidenceIds}))}};
  });res.json(result);}catch(e){fail('report',e,res);}
 });
 app.use((err,_req,res,_next)=>res.status(err.type==='entity.too.large'?413:400).json({error:err.type==='entity.too.large'?'Request is too large.':'Invalid request format.'}));
 return app;
}
