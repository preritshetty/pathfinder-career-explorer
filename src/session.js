import {STARTER_COUNT,FOLLOWUP_COUNT,SURVEY_VERSION} from './config.js';
export const SESSION_KEY='pathfinder-session-v5';
export function loadSession(storage){
 try{storage=storage||window.sessionStorage;const s=JSON.parse(storage.getItem(SESSION_KEY));if(!s||s.version!==SURVEY_VERSION||!['welcome','base','followup','report'].includes(s.stage)||!s.student||!Number.isInteger(s.index)||s.index<0||s.index>=STARTER_COUNT||!s.answers||typeof s.answers!=='object')return null;
 if(['followup','report'].includes(s.stage)&&(!Array.isArray(s.followups)||s.followups.length!==FOLLOWUP_COUNT||typeof s.questionToken!=='string'))return null;
 if(s.stage==='followup'&&s.index>=FOLLOWUP_COUNT)return null;
 if(s.stage==='report'&&(!s.report||!s.profile||!Array.isArray(s.evidence)))return null;
 return s;
 }catch{return null;}
}
export function saveSession(value,storage){try{storage=storage||window.sessionStorage;storage.setItem(SESSION_KEY,JSON.stringify({...value,version:SURVEY_VERSION}));return true;}catch{return false;}}
