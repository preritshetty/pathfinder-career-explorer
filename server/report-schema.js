import {STARTER_COUNT,FOLLOWUP_COUNT} from '../src/config.js';
const str={type:'string'};
const list=(items,n)=>({type:'array',items,minItems:n,maxItems:n});
const obj=properties=>({type:'object',properties,required:Object.keys(properties)});
const ids={type:'array',items:{type:'string',enum:[...Array.from({length:STARTER_COUNT},(_,i)=>`q${i+1}`),...Array.from({length:FOLLOWUP_COUNT},(_,i)=>`f${i+1}`)]},minItems:0,maxItems:5};
export const reportSchema=obj({
 headline:str,summary:str,strengths:list(str,3),
 orientation:obj({summary:str,activities:list(str,3),environments:list(str,3),balance:str,evidenceIds:ids}),
 dimensions:list(obj({overview:str,patterns:list(str,3),development:list(str,3),evidenceIds:ids}),6),
 traitDetails:list(obj({meaning:str,interpretation:str,development:list(str,2),evidenceIds:ids}),6),
 learningPlan:obj({summary:str,strategies:list(str,4),experiments:list(str,3),reflection:str,evidenceIds:ids}),
 workingPreferences:obj({summary:str,collaboration:str,problemSolving:str,decisionMaking:str,development:list(str,3),evidenceIds:ids}),
 careerReadiness:obj({summary:str,awareness:str,values:str,questions:list(str,3),evidenceIds:ids}),
 areas:list(obj({why:str,dayInLife:str,skills:list(str,5),roleExamples:list(str,5),studyRoutes:list(str,3),
  project:obj({title:str,steps:list(str,4),output:str,time:str}),
  connections:list(str,3),questionsToExplore:list(str,2),nextSteps:list(str,3),reflection:str}),4),
 developmentPlan:list(obj({focus:str,why:str,practice:str,successIndicator:str,evidenceIds:ids}),4),
 tryNext:list(str,3),plan:list(obj({title:str,action:str,output:str}),4),
 parentGuide:obj({summary:str,conversations:list(str,3),support:list(str,3),avoid:list(str,2)}),
 educationResearch:obj({summary:str,checklist:list(str,5)}),
 limits:obj({measured:str,notMeasured:str,professionalSupport:str}),
 uncertainty:str,note:str
});
export function validateReport(value,evidence){
 const validIds=new Set(evidence.map(x=>x.id));
 function check(v,s,path='report'){
  if(s.type==='string'){if(typeof v!=='string'||!v.trim()||v.length>8000)throw Error('Incomplete report');}
  if(s.type==='array'){
   if(!Array.isArray(v)||v.length<s.minItems||v.length>s.maxItems)throw Error('Incomplete report');
   v.forEach((x,i)=>check(x,s.items,`${path}.${i}`));
   if(path.endsWith('evidenceIds')&&v.some(id=>!validIds.has(id)))throw Error('Incomplete report');
  }
  if(s.type==='object'){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Incomplete report');for(const [k,def]of Object.entries(s.properties))check(v[k],def,`${path}.${k}`);}
 }
 check(value,reportSchema);
 return value;
}
