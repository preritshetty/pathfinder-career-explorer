// Gemini's constrained decoder can reject deeply nested exact-length arrays.
// Keep the full contract for local validation; send the same shape with count
// instructions as descriptions rather than nested decoder bounds.
export function providerSchema(schema){
 if(!schema.properties?.traitDetails)return schema;
 function simplify(value){
  if(Array.isArray(value))return value.map(simplify);
  if(!value||typeof value!=='object')return value;
  const copy={};for(const [key,item]of Object.entries(value))if(!['minItems','maxItems','enum'].includes(key))copy[key]=simplify(item);
  if(value.type==='array'&&value.minItems===value.maxItems)copy.description=`Return exactly ${value.minItems} entries.`;
  return copy;
 }
 return simplify(schema);
}
