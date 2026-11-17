# Pathfinder

A career exploration prototype for grades 5–12: ten starter questions, five scenario follow-ups, and an explanation of a reproducible interest profile.

## Run

Use Node.js 20+, run `npm install`, copy `.env.example` to `.env`, add a server-side key if appropriate, and run `npm run dev`. Without a key the same survey and scoring work with built-in questions and report guidance. `npm run build` followed by `npm start` serves a production build. Never commit `.env`.

## Scoring and reports

`src/profile.js` contains explicit RIASEC-inspired editorial option tags. This is not a validated Holland assessment. First choice contributes 2 points, second choice 1; multi-trait options split points equally. Neutral/unsure answers earn no points. Free text never affects scoring. Ties use a stable R/I/A/S/E/C order and are exposed as uncertainty rather than interpreted as significant differences. The chart scales each trait relative to the student's highest trait; it is not an aptitude score, percentile or comparison with peers.

The five scenario questions preserve their tagged options; AI may simplify their wording. All six traits remain available in each scenario, ordered by the starter profile, so the survey can explore ties without excluding less prominent interests. Final scores include these follow-up choices. Code selects the top three areas plus a distinct fourth wildcard; AI explains rather than selects them. Sparse evidence remains visible through the answer references. Evidence links prove which options contributed, not that an AI interpretation is necessarily correct.

Grades 5–7 get activities without career labels or degree routes. Grades 8–10 get career examples and skills. Grades 11–12 also get broad study routes. Entrance exams and eligibility are omitted because no country or curriculum is collected. Reports include projects, day-in-the-life examples, four weekly actions, parent/teacher discussion and browser print/save PDF.

## AI, privacy and availability

Normal completion makes two generation requests: all follow-up titles in one, report writing in another. Both request JSON schemas. Transient 429/503 failures get one bounded retry; errors or malformed outputs fall back to built-in content, with a visible notice. Repeating a survey or retrying may make extra requests. There is no second key or quota circumvention.

The server whitelists canonical selected options and grade-band context for model input. Names, free-text notes, school information and client-provided question text are excluded. Notes remain in browser memory and are not interpreted by AI. No database or answer logging is used. Refreshing clears the session.

**Provider restriction:** Google's Gemini API terms restrict API clients directed towards or likely to be accessed by under-18s. This prototype must not be deployed to students using the AI Studio API without resolving that provider restriction; anonymisation does not remove it. See https://ai.google.dev/gemini-api/terms. Synthetic developer testing does not establish suitability for deployment. Choose a provider/product with appropriate terms before student rollout.

## Checks

`node --test tests/profile.test.js` covers tagging, rank weights, neutral answers, stable scoring, scenarios, wildcard selection and grade routes. `npm run build` compiles the app.

## Endpoints

- `GET /api/health`: configuration status (never the key).
- `POST /api/followups`: `{student:{grade}, answers}` with all ten starter answers.
- `POST /api/report`: same body with all five follow-up answers.

Follow-up options are reconstructed from the starter profile on the server. Requests with invalid selections or missing answers receive 400; AI outages return a usable local result labelled `source: local`.
