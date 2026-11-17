import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = Number(process.env.PORT || 3001);
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const here = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '64kb' }));

function jsonFrom(text) {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean);
}

function fallbackQuestions(answers) {
  const words = Object.values(answers || {}).flatMap(a => Array.isArray(a) ? a : [a]).filter(Boolean).join(' ').toLowerCase();
  const themes = [
    ['What is something you have made, tried or learned about this interest?', 'What would you like to make or discover next?'],
    ['When you work on something you enjoy, do you prefer working alone, with one other person, or in a group?', 'What role do you like to take when working with others?'],
    ['Which part sounds most fun: imagining ideas, figuring out how things work, or sharing the result with others?', 'What would you do if your first idea did not work?'],
    ['Would you rather learn this through a book or video, by trying it yourself, or by talking with someone who knows about it?', 'What new skill would you be excited to practise?'],
    ['What small project could you try at school or at home to explore this interest?', 'Who could you ask to help you learn more?'],
  ];
  const focus = words.includes('nature') || words.includes('animal') || words.includes('environment') ? 'nature and living things' : words.includes('art') || words.includes('creative') || words.includes('design') ? 'creative ideas' : words.includes('help') || words.includes('people') ? 'helping people' : words.includes('computer') || words.includes('technology') ? 'technology' : 'your interests';
  return themes.map(([a], i) => ({ id: `f${i + 1}`, title: a, purpose: `Exploring ${focus}`, type: i === 0 || i === 4 ? 'text' : 'single', options: i === 0 || i === 4 ? [] : [['On my own', 'With a partner', 'In a group'], ['Imagining ideas', 'Figuring out how things work', 'Sharing the result'], ['Try another idea', 'Ask someone for advice', 'Take a break and return later'], ['Books or videos', 'Hands-on practice', 'Talking with an expert']][i - 1] || [] }));
}

function makeDemoReport(answers, student = {}) {
  const chosen = Object.values(answers || {}).flatMap(a => Array.isArray(a) ? a : [a]).filter(Boolean);
  const joined = chosen.join(' ').toLowerCase();
  const fields = [
    { keys: ['computer', 'technology', 'robot', 'app', 'website', 'game'], name: 'Technology & computing', examples: ['software developer', 'robotics engineer', 'UX designer'] },
    { keys: ['science', 'space', 'health', 'disease', 'laboratory', 'human body'], name: 'Science & discovery', examples: ['research scientist', 'doctor', 'science communicator'] },
    { keys: ['art', 'design', 'music', 'film', 'creative', 'drawing', 'story'], name: 'Creative arts & design', examples: ['graphic designer', 'animator', 'writer'] },
    { keys: ['help', 'people', 'community', 'education', 'teaching', 'patience'], name: 'People & community', examples: ['teacher', 'counsellor', 'community organiser'] },
    { keys: ['nature', 'animal', 'environment', 'plant', 'outdoors'], name: 'Nature & environment', examples: ['ecologist', 'wildlife veterinarian', 'conservationist'] },
    { keys: ['business', 'money', 'brand', 'product', 'commerce', 'lead'], name: 'Business & leadership', examples: ['entrepreneur', 'product manager', 'marketing specialist'] },
  ];
  const ranked = fields.map(f => ({ ...f, score: f.keys.reduce((n, k) => n + (joined.includes(k) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
  const top = ranked.filter(f => f.score > 0).slice(0, 3);
  const areas = (top.length ? top : ranked.slice(0, 3)).map((f, i) => ({ title: f.name, why: i === 0 ? 'Several of your answers connect with this area. It could be a useful place to explore and see what feels exciting.' : 'This area also connects with things you said you enjoy. Try a small activity to see whether it fits you.', careers: f.examples }));
  return {
    headline: student.name ? `${student.name}, your curiosity has a few directions` : 'Your curiosity has a few directions',
    summary: 'Your answers show interests and strengths that can grow in many different ways. There is no single “right” career hidden in a quiz—use these ideas as starting points, and let your interests change as you learn more.',
    strengths: [...new Set(chosen.flatMap(a => /solve|math|logical|problem/i.test(a) ? ['Analytical thinking'] : /creative|art|design|create|drawing/i.test(a) ? ['Creative thinking'] : /help|people|team|lead|community/i.test(a) ? ['Collaboration and care for others'] : /curious|learn|discover|science|research/i.test(a) ? ['Curiosity and learning'] : /build|practical|hands-on|experiment/i.test(a) ? ['Hands-on problem solving'] : []))].slice(0, 4).length ? [...new Set(chosen.flatMap(a => /solve|math|logical|problem/i.test(a) ? ['Analytical thinking'] : /creative|art|design|create|drawing/i.test(a) ? ['Creative thinking'] : /help|people|team|lead|community/i.test(a) ? ['Collaboration and care for others'] : /curious|learn|discover|science|research/i.test(a) ? ['Curiosity and learning'] : /build|practical|hands-on|experiment/i.test(a) ? ['Hands-on problem solving'] : []))].slice(0, 4) : ['Curiosity', 'Willingness to explore'],
    areas,
    tryNext: ['Choose one area and make a tiny project: a poster, model, interview, experiment or simple app.', 'Ask a teacher, family member or school counsellor what people in this field do during a typical day.', 'Notice which activities make you lose track of time, and keep a short list of them.'],
    note: `Made for exploration${student.grade ? ` in grade ${student.grade}` : ''}. You do not need to decide on a career now.`
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(ai), model }));

app.post('/api/followups', async (req, res) => {
  const { answers, student } = req.body || {};
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Please submit your first set of answers.' });
  if (!ai) return res.json({ questions: fallbackQuestions(answers), demo: true });
  try {
    const prompt = `You are a thoughtful career exploration guide for students in grades 5–12. Based on the student's first questionnaire answers, create exactly 5 short, age-appropriate follow-up questions that help understand interests, preferred activities, values, strengths, and ways they like to learn. Keep questions neutral and open-minded; do not assume a career, socioeconomic background, ability, or gender. Do not ask for personal contact details, exact location, school name, health details, or other sensitive information. Include 2–3 options for choice questions, plus at most one optional short-answer question. Each item must have id (f1-f5), title, purpose, type (single, multi, or text), options (array, empty for text). Return only valid JSON as {"questions":[...]}. Student grade: ${student?.grade || 'not specified'}. Answers: ${JSON.stringify(answers)}`;
    const result = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json' } });
    const parsed = jsonFrom(result.text);
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 5) throw new Error('Unexpected question format');
    res.json({ questions: parsed.questions.map((q, i) => ({ id: `f${i + 1}`, title: String(q.title || '').slice(0, 220), purpose: String(q.purpose || 'A little more about what you enjoy').slice(0, 100), type: ['single', 'multi', 'text'].includes(q.type) ? q.type : 'single', options: Array.isArray(q.options) ? q.options.slice(0, 6).map(o => String(o).slice(0, 150)) : [] })), demo: false });
  } catch (error) {
    console.error('Follow-up generation failed:', error.message);
    res.status(502).json({ error: 'The AI could not create follow-up questions just now. Please try again.' });
  }
});

app.post('/api/report', async (req, res) => {
  const { answers, student } = req.body || {};
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Please submit your answers first.' });
  if (!ai) return res.json({ report: makeDemoReport(answers, student), demo: true });
  try {
    const prompt = `Create a warm, encouraging career exploration report for a student in grades 5–12 using the answers below. Be specific to the answers, but never present this as a diagnosis, aptitude test, prediction, ranking, or final career recommendation. Acknowledge uncertainty and that interests develop. Do not infer sensitive traits. Include 3 exploration areas, each with a short answer-based reason and 2–3 example careers; 3 observable strengths stated tentatively; 3 low-cost, age-appropriate things to try next; a short reassuring summary. Mention career examples as possibilities, not prescriptions. Use plain language for a young reader. Do not ask for or reveal personal data. Return only JSON: {"headline":"...","summary":"...","strengths":["..."],"areas":[{"title":"...","why":"...","careers":["...","..."]}],"tryNext":["...","...","..."],"note":"..."}. Student: ${JSON.stringify({ grade: student?.grade || '', name: student?.name || '' })}. Answers: ${JSON.stringify(answers)}`;
    const result = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json' } });
    const report = jsonFrom(result.text);
    if (!Array.isArray(report.areas) || !Array.isArray(report.strengths) || !Array.isArray(report.tryNext)) throw new Error('Unexpected report format');
    res.json({ report, demo: false });
  } catch (error) {
    console.error('Report generation failed:', error.message);
    res.status(502).json({ error: 'The AI could not create your report just now. Please try again.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(here, '../dist');
  app.use(express.static(dist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(port, () => console.log(`Pathfinder API listening on http://localhost:${port} (${ai ? model : 'demo mode: no API key'})`));
