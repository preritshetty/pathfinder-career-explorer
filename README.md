# Pathfinder

A student-friendly career exploration questionnaire for grades 5–12. Students answer ten starter questions, receive five AI-personalised follow-ups, and get a report with exploration areas, possible career examples, strengths, and practical next steps.

The report is a conversation starter, not an aptitude test or a career prediction. Pathfinder does not save survey responses to a database. With AI enabled, answers are sent to the app server and Google Gemini to create the next questions and report. The optional student name is not sent to Gemini.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add your Google AI Studio API key.
4. Run `npm run dev` and open the local URL shown by Vite (usually `http://localhost:5173`).

Without a key, the complete experience runs in demo mode with sample follow-up questions and a sample report. AI generation uses `gemini-3.5-flash-lite` by default; set `GEMINI_MODEL` in `.env` to another model enabled for your AI Studio account.

## Production build

Run `npm run build`, then `npm start`. The Express server serves the built app on port 3001 by default. Set `PORT` to change it.

## API

- `GET /api/health` — server and AI configuration status.
- `POST /api/followups` — creates exactly five follow-up questions from the first ten answers.
- `POST /api/report` — creates the final exploration report from all answers.

The API key is only read on the server and must never be added to frontend code or committed to Git.
