import {providerSchema} from './provider-schema.js';
// Normal completion is one request per stage. Retry once on quota errors;
// temporary overload may use one configured alternate model instead.
export function createGenerator(ai,{model,fallbackModel='',sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 return async function generate(prompt,schema){
  let selected=model;
  for(let attempt=0;;attempt++){
   try{
    const detailed=Boolean(schema.properties?.traitDetails);
    const large=detailed||Boolean(schema.properties?.questions);
    const config={responseMimeType:'application/json',temperature:0.3,maxOutputTokens:detailed?10000:6000,httpOptions:{timeout:90000}};
    if(selected==='gemini-3.8-flash')config.thinkingConfig={thinkingLevel:'low'};
    if(!large)config.responseJsonSchema=providerSchema(schema);
    const contents=large?prompt+'\nReturn ONLY one JSON object conforming to this schema (array counts in descriptions are required): '+JSON.stringify(providerSchema(schema)):prompt;
    const result=await ai.models.generateContent({model:selected,contents,config});
    const parsed=JSON.parse(result.text);Object.defineProperty(parsed,'_model',{value:selected});return parsed;
   }catch(error){
    const status=Number(error.status);if(attempt>=1||![429,503].includes(status))throw error;
    if(status===503&&fallbackModel)selected=fallbackModel;
    await sleep(1500);
   }
  }
 };
}
