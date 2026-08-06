# BotC Balanced Script Generator

A personal web app that generates **balanced custom scripts** for
[Blood on the Clocktower](https://bloodontheclocktower.com/) from a free-text
concept. You describe an idea — a theme, player count, complexity, and any
must-include / must-exclude characters — and the app uses Claude to assemble a
thematically coherent, mechanically balanced script from the pool of official
(and, later, homebrew) characters.

Balance is judged by an LLM acting as an experienced Storyteller, inside a
**Generate → Evaluate → Refine** loop. The result can be exported as the
official Script Tool **JSON** (importable into clocktower.online / botc.app) and
as a printable **PDF** roster with official role icons and a full night order.

> This is a single-user tool. It runs locally and calls the Anthropic API with
> **your own** API key — there are no accounts, no auth, and no shared hosting.

- Design spec: [`docs/superpowers/specs/2026-06-10-botc-script-generator-design.md`](docs/superpowers/specs/2026-06-10-botc-script-generator-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-06-10-botc-script-generator-plan.md`](docs/superpowers/plans/2026-06-10-botc-script-generator-plan.md)

---

## Features

- **Concept-driven generation** — free-text theme plus player range, complexity,
  edition pool, and must-include / exclude pickers.
- **LLM balance engine** — a two-call Generate → Evaluate loop (separate
  "critic" pass) that refines weak scripts up to a configurable iteration cap and
  always returns the best candidate it found.
- **Official character data** — 181 characters sourced from the official
  Pandemonium Institute dataset, with jinxes and the canonical night order.
- **Live progress** — generation streams its stages to the browser over
  Server-Sent Events.
- **Balance report** — overall score plus per-axis bars (info density, good/evil,
  concept fit, redundancy, degenerate combos, jinx load, complexity), a written
  critique, and concrete suggested swaps.
- **Refine / regenerate** — iterate on a result with an optional note, or roll a
  fresh variant from the same constraints.
- **Export** — official Script Tool JSON, and a print-ready PDF roster with role
  icons, team-coloured sections, and a First Night / Other Nights order page.

---

## Architecture

Three layers in an npm-workspaces monorepo:

```
┌─ client/ (React + Vite + TypeScript) ──────────────────────────┐
│  Concept form · progress view · result + balance · export       │
└───────────────┬────────────────────────────────────────────────┘
                │  HTTP / SSE  (Vite proxies /api → :5174 in dev)
┌───────────────▼─ server/ (Node + Express + TypeScript) ─────────┐
│  POST /api/generate   → Generate→Evaluate→Refine loop (SSE)      │
│  GET  /api/roles      → role list for the pickers               │
│  POST /api/export/json|pdf                                       │
│  Holds the Anthropic API key; serves the built client in prod   │
└───────────────┬────────────────────────────────────────────────┘
                │
┌───────────────▼─ data ──────────────────────────────────────────┐
│  shared/roles.json · shared/nightorder.json  (bundled)          │
│  Anthropic API (Claude)                                          │
└──────────────────────────────────────────────────────────────────┘
```

A backend is required because the Anthropic API cannot be called directly from
the browser (the key would be exposed, and CORS blocks it). The small Express
server keeps the key server-side, runs the engine, and serves the client.

### Tech stack

| Layer    | Choice                                                            |
| -------- | ---------------------------------------------------------------- |
| Client   | React 19, Vite 6, TypeScript                                      |
| Server   | Node 20+, Express 4, TypeScript (`tsx` for dev, `tsc` for build)  |
| LLM      | Anthropic SDK (`@anthropic-ai/sdk`), default model `claude-opus-5` |
| PDF      | `pdfkit`, bundled Noto Sans (Latin + Cyrillic), official role icons |
| Shared   | `@botc/shared` workspace package — domain types + bundled data   |

### Project structure

```
botc-scenario-generator/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/      # ConceptForm, RoleSelect, GenerationProgress, ScriptResult
│       ├── lib/             # api (SSE client), exportJson
│       └── App.tsx          # form → running → result state machine
├── server/                 # Node + Express backend
│   ├── assets/              # bundled PDF font (NotoSans-Regular.ttf)
│   └── src/
│       ├── engine/          # pool, validate, prompts, schemas, generate loop, normalize
│       ├── data/            # roles + night-order loaders
│       ├── export/          # scriptJson + scriptPdf
│       ├── routes/          # generate, roles, export, validate-request
│       ├── anthropic.ts     # AnthropicLlmClient (forced tool use)
│       ├── config.ts        # env-driven configuration
│       └── index.ts         # HTTP server
├── shared/                  # @botc/shared
│   ├── types.ts             # Character, GenerateRequest, EvaluationResult, …
│   ├── roles.json           # 181 official characters (generated)
│   └── nightorder.json      # canonical wake order (generated)
├── scripts/                 # data + asset fetchers
└── docs/superpowers/        # design spec + plan
```

---

## Getting started

### Prerequisites

- **Node.js 20+** (developed on Node 24) and npm.
- An **Anthropic API key** with billing credit. Create one at
  <https://console.anthropic.com/settings/keys>. This is separate from a
  Claude.ai subscription — generation calls bill against API credit.

### Setup

```bash
npm install

# Configure the API key
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

The bundled `shared/roles.json` and `shared/nightorder.json` are already
committed, so no data step is required for a normal run.

### Run (development)

```bash
npm run dev
```

This starts:

- the **server** on <http://localhost:5174> (holds the key, exposes `/api/*`),
- the **client** on <http://localhost:5173> (open this one).

Open <http://localhost:5173>, fill in the concept form, and click **Generate**.
Each run makes a small number of paid Anthropic calls (typically a few cents on
Sonnet).

You can sanity-check the backend without the browser:

```bash
curl http://localhost:5174/api/health
# {"status":"ok","hasApiKey":true,"model":"claude-opus-5"}
```

### Run (production)

```bash
npm run build
NODE_ENV=production npm start   # server serves client/dist on :5174
```

---

## How generation works

`POST /api/generate` runs the engine and streams progress as SSE events
(`pool → generating → validating → evaluating → refining → done`):

1. **Build pool** — filter characters by the selected editions (+ homebrew),
   force-include must-includes, drop excludes, and verify the constraints can
   actually produce a script (otherwise a clear `422` is returned).
2. **Generate** *(Claude)* — given the pool and constraints, the model returns a
   structured selection via forced tool use, plus a concept rationale.
3. **Validate** — check ids exist, composition is sane (≈13/4/4/1+, or
   Teensyville sizes for ≤6 players), must/exclude are honoured, and at least one
   Demon is present. Structural problems trigger an auto-repair retry.
4. **Evaluate** *(Claude)* — a separate critic pass scores the script on seven
   balance axes and returns a critique plus concrete suggested swaps.
5. **Decide** — if the overall score meets the threshold (or the iteration cap is
   reached) the loop stops; otherwise the critique feeds the next generation.
   The best-scoring candidate is always returned, flagged if it never met the
   threshold.

Two separate model calls (generate vs. evaluate) catch balance problems far more
reliably than a single model that both creates and grades its own work.

---

## Export

- **JSON** (`POST /api/export/json`) — the official Script Tool format: a
  `_meta` header followed by character ids, with homebrew inlined as full
  objects. Drops straight into clocktower.online / botc.app.
- **PDF** (`POST /api/export/pdf`) — a printable roster grouped by team with
  official role icons, followed by a **Night Order** page listing the First
  Night and Other Nights wake order (including DUSK, MINION INFO, DEMON INFO, and
  DAWN steps) with Storyteller reminders.

---

## Configuration

All settings are environment variables (see `.env.example`):

| Variable                     | Default              | Description                                   |
| ---------------------------- | -------------------- | --------------------------------------------- |
| `ANTHROPIC_API_KEY`          | —                    | **Required.** Your Anthropic API key.         |
| `PORT`                       | `5174`               | Backend port.                                 |
| `BOTC_MODEL`                 | `claude-opus-5`      | Claude model id used for generation/evaluation. Judging balance is the hard part, so this defaults to the strongest model; set `claude-sonnet-5` or `claude-sonnet-4-6` to spend less. |
| `BOTC_BALANCE_THRESHOLD`     | `8.0`                | Overall score (0–10) at/above which the loop stops. |
| `BOTC_MAX_ITERATIONS`        | `2`                  | Max refinement iterations after the first try. |
| `BOTC_AUTO_REPAIR_ATTEMPTS`  | `2`                  | Retries when the model returns an invalid script. |

---

## Scripts

| Command                | What it does                                              |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Run server (:5174) and client (:5173) together.          |
| `npm run build`        | Type-check and build both workspaces.                    |
| `npm start`            | Run the production server (serves the built client).     |
| `npm test`             | Run the server test suite (`node --test` via `tsx`).     |
| `npm run data:roles`   | Re-fetch & normalise characters + night order from the official dataset. |
| `npm run data:assets`  | Re-download the bundled PDF font into `server/assets/`.  |
| `npm run data:icons`   | Bundle PNG role icons not covered by the runtime source (loric/fabled/newer experimental), converted from the official webp set. |

---

## Testing

The server has unit tests (run with `npm test`) covering the generation loop
against a mocked LLM (threshold, refine, iteration cap, auto-repair, infeasible
pools), request validation, model-output normalisation, the character/night-order
data, and a golden test for the export JSON format. The real generation path is
exercised manually since it makes paid API calls.

---

## Data & credits

Character data, jinxes, and the night order are derived from the official
[Pandemonium Institute release data](https://github.com/ThePandemoniumInstitute/botc-release).
Role icons used in the PDF are fetched from the
[townsquare](https://github.com/bra1n/townsquare) project. Blood on the
Clocktower is a product of The Pandemonium Institute; this tool is an unofficial,
personal utility and is not affiliated with or endorsed by them.

---

## Status

Working end to end: concept → generation (streamed) → balance report → export
(JSON + PDF with night order) → refine / regenerate. Custom **homebrew**
characters can be added in the UI (stored locally) and included in generation
and export. Covered by server and client (vitest) test suites.
