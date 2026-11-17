import {providerSchema} from './provider-schema.js';
const formatFailure=e=>e instanceof SyntaxError||Boolean(e.validationHint)||/Invalid questions|Incomplete report|Incomplete plan/.test(e.message||'');
function parse(text){
 if(typeof text!=='string'||!text.trim())throw new SyntaxError('Empty AI JSON response');
 const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 const value=JSON.parse(cleaned);if(!value||Array.isArray(value)||typeof value!=='object')throw new SyntaxError('Expected an AI JSON object');return value;
}
// One call per stage normally; at most three attempts for transient failures or
// a model-written correction. Quota errors get only one retry on the same model.
export function createGenerator(ai,{model,fallbackModel='',sleep=ms=>new Promise(r=>setTimeout(r,ms)),random=Math.random,maxAttempts=3}){
 return async function generate(prompt,schema,{validate}={}){
  let selected=model,correction='',formatRepairs=0;
  for(let attempt=0;attempt<maxAttempts;attempt++){
   try{
    const detailed=Boolean(schema.properties?.traitDetails);
    const large=detailed||Boolean(schema.properties?.questions);
    const config={responseMimeType:'application/json',temperature:0.2,maxOutputTokens:detailed?12000:6000,httpOptions:{timeout:90000}};
    if(selected==='gemini-3.8-flash')config.thinkingConfig={thinkingLevel:'low'};
    if(!large)config.responseJsonSchema=providerSchema(schema);
    const contents=(large?prompt+'\nReturn ONLY one JSON object conforming to this schema (array counts in descriptions are required): '+JSON.stringify(providerSchema(schema)):prompt)+correction;
    const result=await ai.models.generateContent({model:selected,contents,config});
    const parsed=parse(result.text);validate?.(parsed);
    Object.defineProperty(parsed,'_model',{value:selected});Object.defineProperty(parsed,'_attempts',{value:attempt+1});return parsed;
   }catch(error){
    const status=Number(error.status||error.code);const format=formatFailure(error);
    const temporary=[500,503,504].includes(status)||/Timeout|AbortError|ECONNRESET|fetch failed/i.test(`${error.name||''} ${error.message||''}`);
    if(attempt>=maxAttempts-1||(!format&&!temporary&&status!==429)||(status===429&&attempt>=1))throw error;
    if(format&&formatRepairs>=1)throw error;
    if(format){formatRepairs++;correction='\nYour previous response failed validation. Generate the full response again as valid JSON; '+(error.validationHint||'include every required field and exactly the array counts described. Do not add prose or fences.');}
    else if(temporary&&fallbackModel)selected=selected===model?fallbackModel:model;
    await sleep((status===429?8000:2000)*2**attempt+Math.floor(random()*500));
   }
  }
 };
}
