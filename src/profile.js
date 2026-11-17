import { questions } from './questions.js';

export const traits = { R: 'Hands-on', I: 'Investigating', A: 'Creating', S: 'Helping', E: 'Leading', C: 'Organising' };
// Editorial interest tags, not a validated Holland instrument. Neutral answers earn no points.
export const optionTags = {
 q1:['IC','I','IR','A','SI','A','R','EC'],
 q2:['IC','I','A','I','ES','R'],
 q3:['','','','',''],
 q4:['IR','I','A','EC','A','SI','R'],
 q5:['','','','',''],
 q6:['R','A','IR','A','R','S','RI'],
 q7:['IR','I','A','A','E','R','RS'],
 q8:['IA','I','A','S','EC','R','RI'],
 q9:['R','IA','A','E','I','S','RI'],
 q10:['I','E','A','R','SI','RI','A'],
 q11:['I','A','S','EC','IR','S','R'],
 q12:['E','I','A','ES','R','C'],
 q13:['A','I','S','S','E','I','R'],
 q14:['IC','AS','A','C','I','R','S'],
 q15:['IR','ES','A','EC','I','S','R'],
 q16:['','','','',''],q17:['I','IR','S','I','A'],
 q18:['IR','I','A','S','EC','RI','R'],
 q19:['','','','',''],q20:['I','I','A','S','E','ES','S'],
 q21:['IR','IS','E','A','S','ES','I','R','RI',''],
 q22:['IR','IS','E','A','S','RI','S','I'],
 q23:['IR','IS','I','E','A','S','ES','R'],
 q24:['','','','','','','',''],q25:['','','','',''],
 q26:['IS','RI','S','IR','S','R','S'],
 q27:['R','I','A','E','S','RI','RS'],
 q28:['I','A','S','IR','E','SI'],
 q29:['EC','A','R','ES','S','C','S'],
 q30:['I','R','A','S','E','RI','']
};
// A seed controls presentation only; it must never depend on the student's profile.
export function seededShuffle(items, seed) {
 let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 const result=[...items];
 for(let i=result.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export function maximumScores(followups=[]) {
 const max=Object.fromEntries(Object.keys(traits).map(t=>[t,0]));
 for(const q of [...questions,...followups]) for(const trait of Object.keys(traits)) {
  const weights=q.options.map((_,i)=>{const tags=q.id.startsWith('q')?optionTags[q.id][i]:q.optionTraits?.[i]||'';return tags.includes(trait)?1/tags.length:0;}).sort((a,b)=>b-a);
  max[trait]+=2*(weights[0]||0)+(q.type==='ranked'?(weights[1]||0):0);
 }
 return max;
}
export const clusterCatalog = {
 R:{title:'Building & practical design',careers:['Mechanical designer','Technician','Product maker'],activity:'Make a cardboard model of a useful object. Test it, change one part, and explain what improved.',dayInLife:'A designer may sketch a part, build a model and test how it works.',degrees:['Mechanical engineering','Product design','Technical or vocational training']},
 I:{title:'Science & investigation',careers:['Research scientist','Data analyst','Environmental researcher'],activity:'Choose a simple question about paper planes. Change one feature, record three trials and compare results.',dayInLife:'A researcher may plan a test, examine results and explain what they found.',degrees:['Natural sciences','Statistics','Computer science']},
 A:{title:'Creative design & storytelling',careers:['Graphic designer','Animator','Writer'],activity:'Create a three-panel story or poster, show it to someone and revise one part after hearing their feedback.',dayInLife:'A creative professional may develop ideas, make a draft and refine it after feedback.',degrees:['Design','Fine arts','Animation or communication']},
 S:{title:'People, learning & community',careers:['Teacher','Community educator','Social worker'],activity:'Teach someone a simple skill you know. Make a short guide and ask which step could be clearer.',dayInLife:'A community educator may listen to people, plan a session and help someone practise a skill.',degrees:['Education','Social work','Psychology']},
 E:{title:'Business & team leadership',careers:['Entrepreneur','Project coordinator','Marketing specialist'],activity:'Invent a helpful school service. Write a one-page pitch with a goal, an imaginary budget and feedback from two people.',dayInLife:'A project coordinator may discuss goals, solve team problems and present a plan.',degrees:['Business administration','Commerce','Marketing']},
 C:{title:'Planning, information & operations',careers:['Operations coordinator','Accountant','Information manager'],activity:'Plan a pretend class event. Create a timetable, supply list and simple budget, then check for missing steps.',dayInLife:'An operations professional may organise records, check details and improve a process.',degrees:['Commerce','Accounting','Information management']}
};
export function computeProfile(answers, followups=[]) {
 const scores=Object.fromEntries(Object.keys(traits).map(t=>[t,0]));const evidence=Object.fromEntries(Object.keys(traits).map(t=>[t,[]]));let answered=0;
 for(const q of [...questions,...followups]) {
  const picks=(Array.isArray(answers[q.id])?answers[q.id]:[answers[q.id]]).filter(Boolean);
  const seen=new Set(); let counted=false;
  for(const [rank,pick] of (q.type==='multi'?picks:picks.slice(0,2)).entries()) {
   const idx=q.options.indexOf(pick);if(idx<0||seen.has(pick))continue;seen.add(pick);
   const tags=q.id.startsWith('q')?optionTags[q.id][idx]:q.optionTraits?.[idx];
   if(!tags)continue;counted=true;
   for(const tag of tags){scores[tag]+=(q.type==='multi'?2/picks.length:(rank===0?2:1))/tags.length;if(!evidence[tag].includes(q.id)) evidence[tag].push(q.id);}
  }if(counted)answered++;
 }
 const rawScores={...scores};const maxima=maximumScores(followups);
 for(const t of Object.keys(traits))scores[t]=maxima[t]?rawScores[t]/maxima[t]*100:0;
 const ranking=Object.keys(traits).sort((a,b)=>scores[b]-scores[a]||Object.keys(traits).indexOf(a)-Object.keys(traits).indexOf(b));
 const close=ranking.filter(t=>scores[ranking[0]]-scores[t]<=5);
 const spread=Math.max(...Object.values(scores))-Math.min(...Object.values(scores));
 const broad=spread<12;const sparse=answered<12 || scores[ranking[0]]<15;
 const unsure=['q21','q25','q30'].filter(id=>(Array.isArray(answers[id])?answers[id]:[answers[id]]).some(a=>/not sure|explore many|not thought|before deciding/i.test(a||'')));
 return {version:'editorial-v3',scores,rawScores,maxima,broad,sparse,ranking,evidence,answered,visual:Object.fromEntries(Object.keys(traits).map(t=>[t,Math.round(scores[t])])),uncertainty:{closeTraits:close.length>1?close:[],unsureQuestions:unsure},note:'Each bar shows points earned relative to that trait’s available points. It is not an ability score or a comparison with other students.'};
}
export function selectAreas(profile,grade){
 const picks=profile.ranking.slice(0,3);
 // Stable adjacent direction: the next supported trait, otherwise a clearly labelled experiment.
 const wildcard=profile.ranking.find(t=>!picks.includes(t));
 if(wildcard)picks.push(wildcard);
 return picks.map((t,i)=>({...clusterCatalog[t],trait:t,exploratory:profile.broad||profile.sparse,wildcard:i===picks.length-1&&t===wildcard,evidenceIds:profile.evidence[t].slice(0,3),degrees:Number(grade)>=11?clusterCatalog[t].degrees:[]}));
}
