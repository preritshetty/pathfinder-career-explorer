import 'dotenv/config';
import { logAiFailure } from './ai-errors.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { questions } from '../src/questions.js';
import { computeProfile, questionBank, selectAreas, traits } from '../src/profile.js';

const app=express();
const port=Number(process.env.PORT||3001);
const model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';
const key=process.env.GEMINI_API_KEY?.trim();
const ai=key&&!/^(your_|paste_|replace_)/i.test(key)?new GoogleGenAI({apiKey:key}):null;
app.use(express.json({limit:'64kb'}));
const obj=properties=>({type:'object',properties,required:Object.keys(properties)});
const str={type:'string'};
const arr=(items,n)=>({type:'array',items,minItems:n,maxItems:n});
const followupSchema=obj({titles:arr(str,5)});
const reportSchema=obj({headline:str,summary:str,strengths:arr(str,3),explanations:arr(str,4),reflections:arr(str,4),tryNext:arr(str,3),plan:arr(obj({title:str,action:str}),4),uncertainty:str,discussionPrompt:str,note:str});

async function generate(prompt,schema){
 for(let attempt=0;;attempt++){
  try{
   const r=await ai.models.generateContent({model,contents:prompt,config:{responseMimeType:'application/json',responseJsonSchema:schema,temperature:0.2}});
   return JSON.parse(r.text);
  }catch(e){
   const retryable=[429,503].includes(Number(e.status))||/429|503|RESOURCE_EXHAUSTED|UNAVAILABLE/.test(e.message||'');
   if(!retryable||attempt>=1)throw e;
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
 }
}
function gradeBand(grade){return grade<=7?'5–7':grade<=10?'8–10':'11–12';}
function validateRequest(req){
 const grade=Number(req.body?.student?.grade);
 if(!Number.isInteger(grade)||grade<5||grade>12)throw Error('Choose your grade (5–12) before continuing.');
 const source=req.body?.answers;
 if(!source||typeof source!=='object'||Array.isArray(source))throw Error('Please answer the starter questions.');
 const answers={};
 for(const q of questions){
  const picks=Array.isArray(source[q.id])?source[q.id]:[source[q.id]];
  if(picks.length<1||picks.length>(q.type==='ranked'?2:1)||new Set(picks).size!==picks.length||!picks.every(p=>q.options.includes(p)))throw Error('Please complete all ten starter questions.');
  answers[q.id]=picks;
 }
 // Free text, name, school and client-supplied question wording never enter model input.
 const base=computeProfile(answers);const bank=questionBank(base);
 for(const q of bank){
  if(source[q.id]===undefined)continue;
  const picks=Array.isArray(source[q.id])?source[q.id]:[source[q.id]];
  if(!picks.length||picks.length>2||new Set(picks).size!==picks.length||!picks.every(p=>q.options.includes(p)))throw Error('Choose one or two answers for each follow-up.');
  answers[q.id]=picks;
 }
 return {grade,answers,base,bank};
}
function context(answers,bank){return [...questions,...bank].filter(q=>answers[q.id]).map(q=>({id:q.id,question:q.title,answer:answers[q.id]}));}
function localReport(profile,areas,grade){
 return {
 gradeBand:gradeBand(grade),
 explorationOnly:grade<=7,
 headline:'Your interests, with room to grow',summary:`Your choices give the strongest clues around ${profile.ranking.slice(0,2).map(t=>traits[t].toLowerCase()).join(' and ')}. These are starting points for activities to try.`,
 strengths:profile.ranking.slice(0,3).map(t=>`You may enjoy ${traits[t].toLowerCase()} activities; experience can help you find out more.`),
 areas:areas.map(a=>({...a,why:a.evidenceIds.length?`Your choices in ${a.evidenceIds.map(id=>id.toUpperCase()).join(' and ')} connect with ${traits[a.trait].toLowerCase()}.`:'This is a wildcard activity to try beyond the interests you selected.',reflection:'Which part did you enjoy, and what would you change next time?'})),
 tryNext:['Choose one mini-project below and try it in the next 30 days.','Ask a teacher about a school club connected with one of these activities.','Write down what you enjoyed, found difficult and want to try again.'],
 plan:[{title:'Choose',action:'Pick one project and write down what you hope to learn.'},{title:'Try',action:'Spend 30–60 minutes on the project and keep a draft or photo.'},{title:'Compare',action:'Try an activity from another area and write down what felt different.'},{title:'Reflect',action:'Share both projects with a trusted adult and choose one next step.'}],
 uncertainty:profile.uncertainty.closeTraits.length?'Several interests are close. Try activities from different areas before narrowing your options.':'A preference on a questionnaire does not yet tell us which daily tasks you will enjoy. Try a project to learn more.',
 discussionPrompt:'Which school or home activity could help me explore these interests with support?',
 note:`For grades ${gradeBand(grade)}. Interests can change; these suggestions do not measure ability or rule out other paths.`
 };
}
function validateWriting(w){
 const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<3000;
 for(const k of ['headline','summary','uncertainty','discussionPrompt','note'])if(!text(w[k]))throw Error('Incomplete report');
 for(const [k,n] of [['strengths',3],['explanations',4],['reflections',4],['tryNext',3]])if(!Array.isArray(w[k])||w[k].length!==n||!w[k].every(text))throw Error('Incomplete report');
 if(!Array.isArray(w.plan)||w.plan.length!==4||!w.plan.every(p=>text(p.title)&&text(p.action)))throw Error('Incomplete plan');
}
app.get('/api/health',(_req,res)=>res.json({ok:true,aiConfigured:Boolean(ai),model}));
app.post('/api/followups',async(req,res)=>{
 let data;try{data=validateRequest(req);}catch(e){return res.status(400).json({error:e.message});}
 const {grade,answers,base,bank}=data;
 if(!ai)return res.json({questions:bank,profile:base,source:'local',notice:'Using the built-in scenario questions.'});
 try{
  const result=await generate(`Rewrite these five scenario questions for grade band ${gradeBand(grade)}. Use plain language. Keep the scenario meaning and option compatibility exactly; return only five complete question titles. Do not introduce new tasks that the options would not fit. These scenarios compare close interests; mixed interests are not contradictions. Prioritise clarity around these uncertainty clues: ${JSON.stringify(base.uncertainty)}. Profile: ${JSON.stringify(base.scores)}. Scenarios: ${JSON.stringify(bank.map(q=>({title:q.title,options:q.options})))}. Anonymous selected options: ${JSON.stringify(context(answers,[]))}`,followupSchema);
  if(!Array.isArray(result.titles)||result.titles.length!==5||!result.titles.every(t=>typeof t==='string'&&t.trim()&&t.length<220))throw Error('Invalid questions');
  res.json({questions:bank.map((q,i)=>({...q,title:result.titles[i]})),profile:base,source:'ai'});
 }catch(error){
  const diagnostic=logAiFailure('followups',error);
  res.json({questions:bank,profile:base,source:'local',diagnostic:{code:diagnostic.code},notice:diagnostic.reason.replace('Your report uses built-in guidance.', 'You can continue with the built-in scenarios.').replace('Your report uses the same computed interests with built-in guidance.', 'You can continue with the built-in scenarios.')});
 }
});
app.post('/api/report',async(req,res)=>{
 let data;try{data=validateRequest(req);if(data.bank.some(q=>!data.answers[q.id]))throw Error('Complete all five follow-up questions.');}catch(e){return res.status(400).json({error:e.message});}
 const {grade,answers,bank}=data;
 const profile=computeProfile(answers,bank);const areas=selectAreas(profile,grade);
 // Four directions always: top three plus one distinct, clearly labelled wildcard.

 const fallback=localReport(profile,areas,grade);const evidence=context(answers,bank);
 if(!ai)return res.json({report:fallback,profile,evidence,source:'local',notice:'No AI key is configured. This report uses built-in guidance.'});
 try{
  const w=await generate(`Explain a deterministic editorial interest profile for grade band ${gradeBand(grade)}. This is NOT a validated assessment or an ability measurement. Never exclude a career or claim aptitude. The code has already selected the four areas and all examples: do not replace, rank or add areas or careers in your prose. Explain each area in array order using only the supplied selected-option evidence. Do not invent achievements or assume personal traits. Last area is a wildcard: call it an experiment and acknowledge limited evidence when applicable. Mixed interests can complement each other, not contradict. No scores, percentages, salary or entrance-exam claims. Grades 5–7: short sentences, familiar words and playful activities only; do not mention professions, degrees or academic decisions anywhere in your writing. Grades 8–10: skills and projects. Grades 11–12: broad degree routes are supplied; do not assert eligibility or name exams without a country/curriculum. Give three immediate actions in the next 30 days, four doable weekly actions with outputs, and a practical parent/teacher discussion question. Keep question IDs out of prose. Return only the requested JSON fields. Areas and evidence: ${JSON.stringify(areas)}. Interest profile and uncertainty: ${JSON.stringify(profile)}. Anonymous choices (first choice has greater weight): ${JSON.stringify(evidence)}`,reportSchema);
  validateWriting(w);
  const report={...fallback,...w,areas:areas.map((a,i)=>({...a,why:w.explanations[i],reflection:w.reflections[i]}))};delete report.explanations;delete report.reflections;
  res.json({report,profile,evidence,source:'ai'});
 }catch(error){const diagnostic=logAiFailure('report',error);res.json({report:fallback,profile,evidence,source:'local',diagnostic:{code:diagnostic.code},notice:diagnostic.reason});}
});
if(process.env.NODE_ENV==='production'){
 const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');app.use(express.static(dist));app.get(/.*/,(_req,res)=>res.sendFile(path.join(dist,'index.html')));
}
app.listen(port,()=>console.log(`Pathfinder API listening on http://localhost:${port}`));
