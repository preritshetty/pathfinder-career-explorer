import {traits} from '../src/profile.js';
import {FOLLOWUP_COUNT} from '../src/config.js';
import {reportSchema} from '../server/report-schema.js';
export const generatedQuestions={questions:Array.from({length:FOLLOWUP_COUNT},(_,i)=>({title:`Your class has a new project ${i+1}. Which roles would you choose?`,purpose:'Imagine working together',options:Object.fromEntries(Object.keys(traits).map(t=>[t,`${traits[t]} task ${i+1}`]))}))};
function fill(schema,path=''){
 if(schema.type==='string')return path==='headline'?'A few directions to explore':'Your choices offer an interest to explore through practical activities. Try a small project, keep a record of what you enjoyed, and discuss the experience with a trusted adult.';
 if(schema.type==='array'){if(path.endsWith('evidenceIds'))return ['q1'];return Array.from({length:schema.minItems},()=>fill(schema.items,path));}
 return Object.fromEntries(Object.entries(schema.properties).map(([k,s])=>[k,fill(s,path?`${path}.${k}`:k)]));
}
export const generatedReport=fill(reportSchema);
export async function fixtureGenerate(_prompt,schema){return schema.properties.questions?structuredClone(generatedQuestions):structuredClone(generatedReport);}
