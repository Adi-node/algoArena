# Algo Arena

A strategic training platform built on top of LeetCode. Sync your solved problems, generate custom timed contests from your weakest topics, and track your progress — all in one dark-mode dashboard.

## Features

- **LeetCode Sync** — Verify ownership of your LeetCode account via a token pasted in your profile bio, then pull recent accepted submissions (or backfill your entire solved history with your `LEETCODE_SESSION` cookie) into the local database with real difficulty and topic tags.
- **Custom Contest Engine** — Pick topics, difficulty, number of questions, and duration. The app selects problems you haven't solved yet, starts a countdown timer, and verifies progress via the LeetCode API.
- **Upsolving Queue** — Auto-detects contests you didn't AK and queues the unsolved problems for review. Add specific contests by slug; mark problems done as you solve them.
- **AI Weakness Analysis** — Computes a weighted weakness score per tag from your solved/failed history, diffs it against your previous run, and streams a personalised blind-spot report from an LLM (LangChain → OpenRouter).
- **Practice Mode** — In-browser Monaco editor for category-based problem sets (JS, Node, Express, MongoDB) with hidden test cases executed in a sandboxed [Piston](https://github.com/engineer-man/piston) runner.
- **Dashboard Analytics** — Contest rating chart and submission heatmap pulled from LeetCode's public GraphQL.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon) via Prisma v7 (driver-adapter `@prisma/adapter-pg`) |
| Auth | Auth.js v5 (GitHub + Google OAuth, database sessions) |
| AI | LangChain + OpenRouter (`@langchain/openai` with custom `baseURL`) |
| Code execution | Piston (self-hosted Docker container) |
| Charts | Recharts |
| Editor | Monaco (`@monaco-editor/react`) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) (or any PostgreSQL) database
- GitHub and/or Google OAuth app credentials
- An [OpenRouter](https://openrouter.ai) API key (for AI Weakness Analysis)
- A reachable [Piston](https://github.com/engineer-man/piston) instance (for Practice Mode). The quickest local setup is `docker run -d --name piston -p 2000:2000 ghcr.io/engineer-man/piston`, then install the JS package inside it.
- *(Optional)* Your own `LEETCODE_SESSION` cookie — required by the one-shot full-history backfill and the cached dashboard rating/heatmap queries.

### Environment variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth.js — generate with: npx auth secret
AUTH_SECRET="..."
GITHUB_ID="..."
GITHUB_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# LeetCode session cookie (used by server-side GraphQL calls and full-history backfill)
LEETCODE_SESSION="..."
LEETCODE_CSRFTOKEN="..."

# OpenRouter (AI Weakness Analysis)
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"   # any OpenRouter slug
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"

# Piston code-execution service (defaults to http://localhost:2000)
PISTON_URL="http://localhost:2000"
```

### Install and migrate

```bash
npm install
npx prisma migrate deploy
npx prisma generate
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                            # Landing page
  dashboard/
    page.tsx                          # Overview — stats cards + quick actions
    layout.tsx                        # Sidebar navigation (client)
    RatingChart.tsx / RatingPanel.tsx # LeetCode contest rating chart
    HeatmapCalendar.tsx / HeatmapPanel.tsx # Submission heatmap
    sync/                             # LeetCode account verification + recent sync + full backfill
    contest/                          # Custom-contest creation + past-contests modal
      [id]/                           # Contest room (countdown timer, sync progress, terminate)
    upsolving/                        # Upsolving queue UI (refresh, add-contest, mark-done, reset)
    analysis/                         # AI weakness analysis (streamed report + history)
    practice/                         # Category list → problem list → Monaco editor
      [category]/[id]/                # PracticeRoom: code + run + hidden tests
      history/                        # Past practice attempts
  api/
    auth/[...nextauth]/               # Auth.js route handler
    user/verify-leetcode/             # Generate + atomically verify ownership token
    leetcode/sync/                    # Pull recent accepted submissions
    leetcode/bootstrap/               # One-shot full-history backfill via LEETCODE_SESSION
    leetcode/verify/                  # Username lookup
    leetcode/contest/                 # Fetch LeetCode contest history
    contest/create/                   # Create a ContestSession with unsolved questions
    contest/[id]/sync/                # Verify solved questions (single GraphQL call + transaction)
    contest/[id]/end/                 # End or abandon a contest session (idempotent)
    upsolving/refresh/                # Auto-detect missed contest problems
    upsolving/add-contest/            # Manually queue a contest's unsolved problems
    upsolving/mark-done/              # Dismiss an item
    upsolving/reset/                  # Wipe the queue
    analytics/ai-analysis/            # Streamed weakness report (SSE)
    execute/                          # Run user code against hidden tests via Piston
lib/
  leetcode.ts                         # LeetCode GraphQL helpers + per-username cache tags
  prisma.ts                           # Prisma singleton with pg driver adapter
  practice.ts                         # Category/question loader from data/*.json
  weakTopics.ts                       # Per-tag weakness scoring from solved + failed history
data/
  js.json node.json express.json mongodb.json   # Practice problem sets w/ hidden tests
prisma/
  schema.prisma                       # Database schema
```

## Database Schema (key models)

```
User               — auth + leetcodeUsername + leetcodeVerifyToken
Question           — leetcodeId, slug, title, difficulty, tags[]
UserSolved         — userId + questionId + solvedAt + language
ContestSession     — userId, topics[], difficulty, quantity, durationMinutes, status
ContestQuestion    — contestSessionId + questionId + solved
UpsolvingItem      — userId + questionId + contestTitle + contestDate + dismissed
PracticeAttempt    — userId + questionId + category + code + output + status
WeakTopicAnalysis  — userId + topTags[] + summary + scoresJson  (history of AI runs)
```

## How the contest flow works

1. User selects topics, difficulty, question count, and duration on `/dashboard/contest`.
2. The server queries all `Question` rows the user has no `UserSolved` record for, shuffles them, and creates a `ContestSession` with up to the requested number of `ContestQuestion` rows.
3. The user is redirected to `/dashboard/contest/[id]` where a countdown timer runs client-side, computed from the stored `startedAt` timestamp — so it survives page refreshes.
4. Clicking **Sync Progress** calls the LeetCode GraphQL API (`recentAcSubmissionList`) for each unsolved question. Solved ones are marked in the database. If all are solved, the session is automatically completed.
5. Clicking **End Contest** marks the session as abandoned.

## Notes

- The LeetCode sync checks your **50 most recent** accepted submissions. Problems solved more than 50 ACs ago will not be detected by Sync Progress — use the one-shot **Full history backfill** (Sync page) with your `LEETCODE_SESSION` cookie to import everything once.
- Prisma v7 requires a driver adapter — this project uses `@prisma/adapter-pg`. The generated client lives at `app/generated/prisma/` (not `node_modules/.prisma/client`).
- Practice Mode requires the Piston runtime to have the matching language installed (currently JavaScript 20.11.1). After starting the Piston container, install Node with `curl -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"node","version":"20.11.1"}'`.
- AI Weakness Analysis streams via Server-Sent Events. The route has a 60-second Vercel `maxDuration` cap; the client aborts the stream after 30 seconds of silence.
- The dashboard's rating and heatmap panels are cached for 5 minutes per LeetCode username via `unstable_cache`; sync operations call `revalidateTag` to invalidate.
