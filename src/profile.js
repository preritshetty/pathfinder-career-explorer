import { questions } from './questions.js';

export const traits = { R: 'Hands-on', I: 'Investigating', A: 'Creating', S: 'Helping', E: 'Leading', C: 'Organising' };
// Editorial interest tags, not a validated Holland instrument. Neutral answers earn no points.
export const optionTags = {
 q1: ['I','RI','A','S','R','EC','RI'], q2: ['IC','I','IR','A','SI','A','R','EC'],
 q3: ['IR','I','EC','A','SI','RI','R'], q4: ['IC','IR','S','I','R','C'],
 q5: ['I','A','I','S','E','ES','RI'], q6: ['IR','I','S','A','RI','EC','R',''],
 q7: ['IR','IS','RI','S','S','E','A','I'], q8: ['I','A','S','ES','S','I','R',''],
 q9: ['IA','R','E','A','I','S','RI',''], q10: ['','','','']
};
const scenarios = [
 ['Your school is planning a fair. Which jobs would you choose?', ['Build the stalls','Test a science idea','Design the posters','Welcome and help visitors','Pitch the fair to sponsors','Plan the schedule']],
 ['A club wants to improve its space. What would you try first?', ['Make a useful model','Find out what is not working','Sketch a new layout','Listen to what members need','Get people excited about a plan','Organise the tasks and supplies']],
 ['You have an hour for a team challenge. Which parts sound best?', ['Build a prototype','Test which idea works','Invent an original approach','Help everyone join in','Present and persuade','Keep track of steps and time']],
 ['A school garden needs help. What would you like to do?', ['Plant and build supports','Study what helps plants grow','Design signs and displays','Show younger students around','Convince others to take part','Track supplies and watering']],
 ['Your first project did not work. What would you do next?', ['Adjust the parts and try again','Compare results to find the cause','Imagine a different design','Discuss it with a teammate','Set a new goal for the team','Write a checklist for another attempt']]
];
export function questionBank(profile) {
 const order = [...profile.ranking];
 return scenarios.map(([title, options], i) => ({ id:`f${i+1}`, title, purpose:'Try a different situation', type:'ranked', options:order.map(t=>options[Object.keys(traits).indexOf(t)]), optionTraits:order }));
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
  for(const [rank,pick] of picks.slice(0,2).entries()) {
   const idx=q.options.indexOf(pick);if(idx<0||seen.has(pick))continue;seen.add(pick);
   const tags=q.id.startsWith('q')?optionTags[q.id][idx]:q.optionTraits?.[idx];
   if(!tags)continue;counted=true;
   for(const tag of tags){scores[tag]+=(rank===0?2:1)/tags.length;if(!evidence[tag].includes(q.id)) evidence[tag].push(q.id);}
  }if(counted)answered++;
 }
 const ranking=Object.keys(traits).sort((a,b)=>scores[b]-scores[a]||Object.keys(traits).indexOf(a)-Object.keys(traits).indexOf(b));
 const peak=Math.max(...Object.values(scores),1);
 const close=ranking.filter(t=>scores[ranking[0]]-scores[t]<=2);
 const unsure=['q6','q8','q9','q10'].filter(id=>(Array.isArray(answers[id])?answers[id]:[answers[id]]).some(a=>/not sure|still discovering|something else|no idea/i.test(a||'')));
 return {version:'editorial-v1',scores,ranking,evidence,answered,visual:Object.fromEntries(Object.keys(traits).map(t=>[t,Math.round(scores[t]/peak*100)])),uncertainty:{closeTraits:close.length>1?close:[],unsureQuestions:unsure},note:'Interest clues from this questionnaire, not aptitude scores or a validated assessment.'};
}
export function selectAreas(profile,grade){
 const picks=profile.ranking.slice(0,3);
 // Stable adjacent direction: the next supported trait, otherwise a clearly labelled experiment.
 const wildcard=profile.ranking.find(t=>!picks.includes(t));
 if(wildcard)picks.push(wildcard);
 return picks.map((t,i)=>({...clusterCatalog[t],trait:t,wildcard:i===picks.length-1&&t===wildcard,evidenceIds:profile.evidence[t].slice(0,3),degrees:Number(grade)>=11?clusterCatalog[t].degrees:[]}));
}
