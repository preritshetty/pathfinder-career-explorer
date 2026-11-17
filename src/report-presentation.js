// Keep answer references factual rather than displaying model-written bare IDs.
export function presentConnections(lines,evidence){
 const byId=new Map(evidence.map(q=>[q.id.toLowerCase(),q]));
 return lines.flatMap(line=>{
  if(!/^(?:[qf]\d+[\s,;]*)+$/i.test(line.trim()))return [line];
  return [...new Set(line.toLowerCase().match(/[qf]\d+/g))].flatMap(id=>{
   const item=byId.get(id);return item?[`${id.toUpperCase()}: You selected ${item.answer.join('; ')}.`]:[];
  });
 });
}
export function hasDistinctOverview(overview,title){
 const normal=text=>text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
 return normal(overview)!==normal(title);
}
