# Pathfinder

A student career-exploration prototype for grades 5–12. The 30 starter questions from the supplied Academic Interests and Learning Preferences document are followed by ten genuinely AI-generated scenarios and an AI-generated report. No built-in report is silently substituted for AI output.

## Run locally: complete setup guide

These steps are for someone starting from this GitHub repository on macOS, Windows or Linux. You need an internet connection for dependency installation and AI generation. No database, Python, Docker or paid hosting account is required.

### 1. Install the prerequisites

- **Node.js 24 LTS**, including npm: download the installer for your computer from [Node.js](https://nodejs.org/en/download). A supported LTS release is recommended; the code requires Node.js 20 or newer.
- **Git**: install it from [Git](https://git-scm.com/downloads). Git is optional if you use the ZIP download method below.
- A Google account with access to Google AI Studio.
- Access to this GitHub repository. It is currently **private**, so the owner must give your GitHub account access before you can clone or download it.

After installing Node.js and Git, close and reopen your terminal. Use **Terminal** on macOS/Linux or **PowerShell** on Windows, then check:

```bash
node --version
npm --version
git --version
```

Each command should print a version number. If a command is not found, finish its installation and reopen your terminal before continuing.

### 2. Download the project

**Option A: clone with Git**

Open a terminal in the folder where you keep projects and run:

```bash
git clone https://github.com/preritshetty/pathfinder-career-explorer.git
cd pathfinder-career-explorer
```

Authenticate with a GitHub account that has repository access if prompted. HTTPS Git authentication uses a credential manager, browser sign-in or token—not your GitHub account password. Do not put a token in the clone URL or share it in chat.

**Option B: download a ZIP**

1. Sign in to GitHub and open [the repository](https://github.com/preritshetty/pathfinder-career-explorer).
2. Select **Code → Download ZIP**.
3. Extract the ZIP to a normal folder; do not run the project from inside the compressed archive.
4. Open a terminal in the extracted folder. Its name may be `pathfinder-career-explorer-main`.

For either option, you are in the correct project folder when you can see `package.json`, `package-lock.json`, `.env.example`, `src/` and `server/`.

### 3. Install the project dependencies

From that project folder, run:

```bash
npm ci
```

This installs the versions recorded in `package-lock.json`. Wait for the command to finish. You only need to repeat it after downloading updates that change dependencies or after deleting `node_modules`.

### 4. Get a Google AI Studio API key

1. Open the [Google AI Studio API keys page](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account. Review and accept Google's terms yourself if prompted.
3. If AI Studio has already created a default project and key, you can use that key. Otherwise select **Create API key** and follow the dialog to select or create a Google Cloud project and name the key. Exact labels can vary with the AI Studio interface.
4. Copy the newly created key. If a project you already own is missing, open AI Studio's **Dashboard → Projects → Import projects**, import it, then return to **API Keys**.
5. Check the project's billing tier and available model quota in AI Studio. To try free-tier usage, use a project/model with a free-tier allocation. You do not need to enable paid billing just to follow this local setup where free-tier access is available; if Google says your account/region/model requires billing, check its pricing before proceeding.
6. Keep the key private. You will paste it into the local `.env` file in the next step, never into frontend source code or this repository.

Use a newly created key if an old one is rejected. If key creation is disabled for a work/school project, you may need the project administrator to grant the required permissions.

Google's own instructions: [API key management](https://ai.google.dev/gemini-api/docs/api-key), [billing and free-tier access](https://ai.google.dev/gemini-api/docs/billing), [model pricing](https://ai.google.dev/gemini-api/docs/pricing), and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). Free-tier limits and model availability can change; check your project's current allocation rather than relying on a fixed quota number.

### 5. Create and fill in `.env`

The real `.env` file is intentionally not in GitHub. Create your own copy **in the project root, next to `package.json`**.

**macOS / Linux:**

```bash
cp .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Open `.env` in a text editor and replace the placeholder key:

```dotenv
GEMINI_API_KEY=PASTE_YOUR_ACTUAL_GOOGLE_AI_STUDIO_KEY_HERE
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3001
```

- Replace only the placeholder after `GEMINI_API_KEY=` with the complete key you copied. Do not leave the sample value there.
- Keep each setting on its own line, without spaces around `=`. Do not add Markdown backticks to the file.
- Keep `GEMINI_MODEL` as shown initially. If AI Studio says that model is unavailable to your project, set it to a compatible text model with structured JSON support that your account can access; check whether it has a free tier first.
- Keep `PORT=3001` unless that port is already in use.
- Save the file with the exact name `.env`, not `.env.txt`. In Windows File Explorer, turn on **File name extensions** if needed to check the name. On macOS, dotfiles may be hidden in Finder; you can still open them from your editor.
- `.env` is ignored by Git. Never remove that ignore rule or upload the real key.

If you change `.env` while the app is running, stop the app with **Ctrl+C** and start it again. Changing the file alone is not a reliable way to reload the key.

### 6. Start the app

From the project root, run:

```bash
npm run dev
```

Keep that terminal running. This one command starts both the React frontend and the API server.

You should see messages similar to:

```text
Pathfinder listening on http://localhost:3001
Local: http://localhost:5173/
```

Open the **Local URL printed by Vite** in your browser—normally [http://localhost:5173](http://localhost:5173). If that port is occupied, Vite may choose `5174` or another port. Open the printed URL rather than assuming the port. The correct page is branded **Pathfinder**.

The two ports do different jobs:

| Port | Purpose |
| --- | --- |
| `5173` (or Vite's next available port) | The student-facing app in development |
| `3001` | The backend API used by the app |

Do not use `localhost:3001` as the development frontend URL.

### 7. Confirm the setup works

1. Open [http://localhost:3001/api/health](http://localhost:3001/api/health). You should see:

   ```json
   {"ok":true,"aiConfigured":true}
   ```

   `aiConfigured: true` means a non-placeholder key was loaded. It does **not** prove that Google accepts the key or that quota is available.

2. Return to the frontend, select a grade, and start a survey using fictional answers for your first check.
3. Answer the 30 starter questions. Select one or more answers for each, as instructed in the source questionnaire.
4. Continue after question 30. The app should obtain **ten AI-generated follow-up scenarios**. This confirms a real generation request can succeed.
5. Answer the ten follow-ups and select **See my report**. The app should obtain the **AI-generated report**.
6. To export it, select **Print / save PDF**, choose **Save as PDF** in the browser's print dialog, and choose a location. The report automatically includes its collapsed sections when printed, then restores the screen layout.

Repeated identical answers can reuse a recent AI result from the server's cache, so a repeat run may be much faster. This does not mean the app replaced the AI with static questions or a static report.

### 8. Stop, restart or update later

- **Stop:** press **Ctrl+C** in the terminal running the app.
- **Start again:** open a terminal, `cd` into the project folder, and run `npm run dev`. You do not need to create another key or reinstall dependencies every time.
- **Update a Git clone:** stop the app, run the commands below, then restart it. Git will stop if local changes conflict; keep your local work rather than forcing a reset.

  ```bash
  git pull --ff-only
  npm ci
  npm run dev
  ```

Your `.env` remains local and is not replaced by a normal Git update.

### Troubleshooting

| What you see | What to check or do |
| --- | --- |
| `Repository not found` / GitHub 404 | Sign in with an account invited to this private repository and accept the invitation. |
| `node`, `npm` or `git` is not recognised | Install the missing prerequisite and reopen your terminal. |
| Windows blocks `npm.ps1` | Use `npm.cmd` instead of `npm` in PowerShell, or run the commands from Command Prompt. You do not need to weaken PowerShell's execution policy. |
| npm cannot find `package.json` | Your terminal is in the wrong folder. Change into the cloned/extracted project root. |
| `aiConfigured: false` | Check `.env` location/name, replace the key placeholder, save, and restart the server. |
| AI key or project permissions need attention | Create a new key in AI Studio, check its project permissions, update `.env`, and restart. |
| Configured model is unavailable | Check your project's enabled models, update `GEMINI_MODEL`, and restart. |
| Google quota/rate limit reached | Wait for the applicable limit to reset and check AI Studio usage. A second key in the same project does not provide a separate project quota. |
| Google's AI service is temporarily busy | Wait briefly, then retry the same button. Your answers remain saved. |
| AI response did not pass content checks | Retry. The app rejects incomplete/invalid generated content instead of showing it as a completed AI result. |
| Page loads but AI requests fail | Keep `npm run dev` running; inspect the backend message and health endpoint. The frontend loading alone does not verify Google access. |
| PDF button does not show a save dialog | Open the frontend URL in a normal desktop browser such as Chrome or Edge, then choose **Save as PDF** in its print dialog. |
| You see another app on port 5173 | Open the Local URL this project's Vite process printed; it may be 5174. |
| `EADDRINUSE` on port 3001 | Stop your other copy of this project's API, or follow the custom-port steps below. |
| Question session expired / starter answers changed | Go back to question 30 and continue again to generate follow-ups for the current answers. |

**If you need a different backend port:** change `PORT=3002` in `.env`, then start with the matching frontend proxy setting:

macOS / Linux:

```bash
API_TARGET=http://localhost:3002 npm run dev
```

Windows PowerShell:

```powershell
$env:API_TARGET="http://localhost:3002"
npm run dev
```

In Windows PowerShell that setting lasts for the current terminal session. Your health endpoint is now `http://localhost:3002/api/health`. Keep the backend `PORT` and `API_TARGET` values in agreement.

### Optional: run a production build locally

The development command above is sufficient for local use. To try the compiled application, stop the dev server, then run:

```bash
npm run build
```

**macOS / Linux:**

```bash
NODE_ENV=production npm start
```

**Windows PowerShell:**

```powershell
$env:NODE_ENV="production"
npm start
```

Open [http://localhost:3001](http://localhost:3001) (or the port in `.env`). In production mode the backend serves both the compiled frontend and the API, so there is no Vite port. `npm start` without `NODE_ENV=production` starts the API but does not serve the compiled frontend. Reopen PowerShell or remove its temporary `NODE_ENV` setting before returning to development mode.

---

## AI requirements and error behaviour

Normal completion makes two provider calls: one generates ten new scenario questions and six choices per question; one writes the report's summary, explanations, projects, day-in-the-life snapshots, reflections and plan. Both request structured JSON mode with explicit shape instructions to avoid Gemini constrained-decoder complexity limits for this larger survey. The server enforces exact counts, six trait options per generated question, the full detailed report schema and valid evidence IDs locally. Every scenario must contain one choice for each of six interest traits. Generated options are checked structurally, independently shuffled using a random seed, and signed by the server; they are not ordered by the starter profile.

Code chooses the career areas; AI explains them. Transient 429/503 failures get one bounded retry. Optionally set `GEMINI_FALLBACK_MODEL` to another compatible model that your account can access to use it on temporary overload; this is disabled by default and does not change projects or keys. Check that model’s current pricing and quota before enabling it. If generation fails or output is invalid, the API returns an explicit retry error and the browser keeps answers. It does not label static text as AI. Duplicate requests share in-flight work and successful results are cached by a SHA-256 digest for 30 minutes (100-entry memory cap). Retries and cache expiration can add requests beyond the normal two. Responses include `generation.provider`, `generation.cacheHit` and `generation.generatedAt` so reused AI content can be distinguished from fresh generation.

## Scoring

The original question wording and choices remain in `src/questions.js`. Starter selections are unordered: each question has a 2-point budget divided equally among the selected options. AI follow-up first choices receive 2 points and optional second choices 1. Tags in `src/profile.js` are editorial RIASEC-inspired interests, not a validated Holland instrument. Multi-trait options split their point budget equally. Neutral answers score zero; text notes are not scored.

Raw earning opportunities differ by trait. Each score is divided by that trait's maximum achievable points across the 40 presented questions, accounting for multi-select starter questions and ranked follow-ups. Tests check that all six can reach a normalised 100. Bars use a fixed 0–100 scale rather than stretching the largest score to full width. These are neither percentiles nor ability scores. Stable tie-breaking supports reproducibility; broad/sparse flags prevent small differences being presented as a strong match. Thresholds and tags still require human validation.

## Grade and report presentation

All 30 starter questions preserve the wording and options from the supplied questionnaire. AI receives grade-band instructions for the ten generated follow-ups and detailed report. Grades 5–7 use simple activity-focused wording; grades 8–10 explore skills/projects; grades 11–12 also get broad study routes. No exam or eligibility claims are made without country/curriculum context.

The detailed report includes an overview and framework, orientation, six RIASEC interpretations, six questionnaire-dimension analyses, learning/working preferences, career awareness, four substantial career dossiers, development actions, a four-week plan, parent/teacher guidance, study-research steps, limitations and a complete 40-answer record. Section navigation supports reading on screen; the complete report is included in print. Content remains grade-appropriate. Aptitude, IQ, EQ and clinical personality measures are explicitly not assessed. Print/save PDF opens the browser print dialog. The report automatically expands all sections for printing and restores their previous state afterwards.

## Privacy and session handling

Progress, including name and private notes, is stored in `sessionStorage` for refresh recovery in the same tab. Start over clears the survey; browser session restoration can also restore session storage. Avoid personal details in notes on shared devices.

The frontend sends selected choices, grade and a signed generated-question token. Names and private notes are excluded. The server validates against canonical starter options and signed generated options; only anonymous choices and grade context enter model prompts. The cache holds generated questions/reports and answer evidence in process memory for up to 30 minutes; there is no student database. Error logs contain only stage, failure category, status and time, not SDK error text, answers or keys. Tests exercise that exclusion in success and failure paths.

`.data/session-secret` is automatically created with private filesystem permissions so signed questions stay valid across server restarts. Tokens expire after 24 hours. A changed starter response or grade requires regenerating the follow-ups. Multi-instance hosting would need shared signing and cache configuration.

API bodies are capped at 96 KB to accommodate signed ten-question bundles. Requests are limited to 30 per IP per minute with no trust in client-supplied forwarding headers. This in-process limiter is for a prototype, not distributed production abuse protection.

## Checks

- `npm test`: scoring, payload validation, privacy/error logs, signed sessions, caching, size and rate limits.
- `npm run test:e2e`: complete browser flow, keyboard ranking, reload recovery, AI failure/retry, and axe accessibility checks on welcome/question/report screens.
- `npm run build`: production compilation.

Browser tests currently launch a development-server command using POSIX environment syntax; use macOS, Linux or WSL for those optional checks. For browser tests install Chromium with `npx playwright install chromium`. Tests run dedicated local ports and use a fake generator injected only into the test server. GitHub Actions runs tests/build/browser checks without an API secret. See `docs/VALIDATION.md` for pending human review and student trials; none have been claimed as completed.

## Provider terms

The AI integration remains because AI-generated questions and report are requirements. Google's Gemini API terms restrict API clients directed towards or likely to be accessed by under-18s: https://ai.google.dev/gemini-api/terms. Having a parent operate this student-directed app does not automatically establish an exception. Resolve the provider arrangement before student rollout. Synthetic developer tests are not a compliance determination.

## API

- `GET /api/health`: configuration status, never the key.
- `POST /api/followups`: `{student:{grade}, answers}` with the 30 starter answers; returns ten AI questions and `questionToken`.
- `POST /api/report`: `{student:{grade}, answers, questionToken}` including all 40 answers; returns an AI report and computed profile.
