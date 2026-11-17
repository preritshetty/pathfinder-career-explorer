# Pathfinder

A student career-exploration prototype for grades 5–12. The existing ten starter questions are followed by five genuinely AI-generated scenarios and an AI-generated report. No built-in report is silently substituted for AI output.

## Run

Use Node.js 20+. Run `npm install`, copy `.env.example` to `.env`, add your server-side Gemini key and run `npm run dev`. `GEMINI_MODEL` selects the model; it defaults to `gemini-3.5-flash-lite`. A real key is required for follow-up/report generation. `npm run build` and `npm start` serve a production build. Keep `.env` and `.data/` private and out of Git.

## AI requirements and error behaviour

Normal completion makes two provider calls: one generates five new scenario questions and six choices per question; one writes the report's summary, explanations, projects, day-in-the-life snapshots, reflections and plan. Both request structured JSON. Every scenario must contain one choice for each of six interest traits. Generated options are checked structurally, independently shuffled using a random seed, and signed by the server; they are not ordered by the starter profile.

Code chooses the career areas; AI explains them. Transient 429/503 failures get one bounded retry. If generation fails or output is invalid, the API returns an explicit retry error and the browser keeps answers. It does not label static text as AI. Duplicate requests share in-flight work and successful results are cached by a SHA-256 digest for 30 minutes (100-entry memory cap). Retries and cache expiration can add requests beyond the normal two. Responses include `generation.provider`, `generation.cacheHit` and `generation.generatedAt` so reused AI content can be distinguished from fresh generation.

## Scoring

The original question wording and choices remain in `src/questions.js`. First choices receive 2 points; optional second choices 1. Tags in `src/profile.js` are editorial RIASEC-inspired interests, not a validated Holland instrument. Multi-trait options split their point budget equally. Neutral answers score zero; text notes are not scored.

Raw earning opportunities differ by trait. Each score is divided by that trait's maximum achievable points across the presented questions, including the two ranked choices. Tests check that all six can reach a normalised 100. Bars use a fixed 0–100 scale rather than stretching the largest score to full width. These are neither percentiles nor ability scores. Stable tie-breaking supports reproducibility; broad/sparse flags prevent small differences being presented as a strong match. Thresholds and tags still require human validation.

## Grade and report presentation

The first ten questions stay the same. AI receives grade-band instructions for the five generated follow-ups and report. Grades 5–7 use simple activity-focused wording; grades 8–10 explore skills/projects; grades 11–12 also get broad study routes. No exam or eligibility claims are made without country/curriculum context.

The report leads with an overview, one thing to try this week and areas to explore. Younger students see two areas first, with the remaining experiments in a disclosure. Evidence, projects, profile, four-week plan and parent/teacher context can be expanded. Print/save PDF opens the browser print dialog. The report automatically expands all sections for printing and restores their previous state afterwards.

## Privacy and session handling

Progress, including name and private notes, is stored in `sessionStorage` for refresh recovery in the same tab. Start over clears the survey; browser session restoration can also restore session storage. Avoid personal details in notes on shared devices.

The frontend sends selected choices, grade and a signed generated-question token. Names and private notes are excluded. The server validates against canonical starter options and signed generated options; only anonymous choices and grade context enter model prompts. The cache holds generated questions/reports and answer evidence in process memory for up to 30 minutes; there is no student database. Error logs contain only stage, failure category, status and time, not SDK error text, answers or keys. Tests exercise that exclusion in success and failure paths.

`.data/session-secret` is automatically created with private filesystem permissions so signed questions stay valid across server restarts. Tokens expire after 24 hours. A changed starter response or grade requires regenerating the follow-ups. Multi-instance hosting would need shared signing and cache configuration.

API bodies are capped at 32 KB. Requests are limited to 30 per IP per minute with no trust in client-supplied forwarding headers. This in-process limiter is for a prototype, not distributed production abuse protection.

## Checks

- `npm test`: scoring, payload validation, privacy/error logs, signed sessions, caching, size and rate limits.
- `npm run test:e2e`: complete browser flow, keyboard ranking, reload recovery, AI failure/retry, and axe accessibility checks on welcome/question/report screens.
- `npm run build`: production compilation.

For browser tests install Chromium with `npx playwright install chromium`. Tests run dedicated local ports and use a fake generator injected only into the test server. GitHub Actions runs tests/build/browser checks without an API secret. See `docs/VALIDATION.md` for pending human review and student trials; none have been claimed as completed.

## Provider terms

The AI integration remains because AI-generated questions and report are requirements. Google's Gemini API terms restrict API clients directed towards or likely to be accessed by under-18s: https://ai.google.dev/gemini-api/terms. Having a parent operate this student-directed app does not automatically establish an exception. Resolve the provider arrangement before student rollout. Synthetic developer tests are not a compliance determination.

## API

- `GET /api/health`: configuration status, never the key.
- `POST /api/followups`: `{student:{grade}, answers}` with the ten starter answers; returns five AI questions and `questionToken`.
- `POST /api/report`: `{student:{grade}, answers, questionToken}` including all fifteen answers; returns an AI report and computed profile.
