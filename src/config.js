import {questions} from './questions.js';
export const STARTER_COUNT=questions.length;
export const FOLLOWUP_COUNT=10;
export const TOTAL_COUNT=STARTER_COUNT+FOLLOWUP_COUNT;
export const SURVEY_VERSION=5;
export const sections=[...new Set(questions.map(q=>q.section))];
