import {FOLLOWUP_COUNT} from '../src/config.js';
import {traits} from '../src/profile.js';
const obj=properties=>({type:'object',properties,required:Object.keys(properties)});
export const questionSchema=obj({questions:{type:'array',minItems:FOLLOWUP_COUNT,maxItems:FOLLOWUP_COUNT,items:obj({title:{type:'string',minLength:1,maxLength:220},purpose:{type:'string',minLength:1,maxLength:80},options:obj(Object.fromEntries(Object.keys(traits).map(t=>[t,{type:'string',minLength:1,maxLength:120}])))})}});
function invalid(hint){const error=Error('Invalid questions');error.validationHint=hint;throw error;}
export function validateGeneratedQuestions(raw){
 if(!Array.isArray(raw?.questions)||raw.questions.length!==FOLLOWUP_COUNT)invalid(`questions must contain exactly ${FOLLOWUP_COUNT} items.`);
 const unique=new Set();
 for(const [i,q]of raw.questions.entries()){
  if(!q||typeof q!=='object')invalid(`questions[${i}] must be an object.`);
  for(const [key,max]of [['title',220],['purpose',80]])if(typeof q[key]!=='string'||!q[key].trim()||q[key].length>max)invalid(`questions[${i}].${key} must be nonempty text of at most ${max} characters.`);
  const normal=q.title.trim().toLowerCase();if(unique.has(normal))invalid('All ten scenario titles must be distinct.');unique.add(normal);
  const options=Object.keys(traits).map(t=>q.options?.[t]);
  if(!options.every(t=>typeof t==='string'&&t.trim()&&t.length<=120))invalid(`questions[${i}].options must contain six nonempty R/I/A/S/E/C texts, each at most 120 characters.`);
  if(new Set(options.map(t=>t.trim().toLowerCase())).size!==6)invalid(`questions[${i}] must have six distinct options.`);
 }
 return raw;
}
