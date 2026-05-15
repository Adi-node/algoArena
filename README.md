# Algo Arena

A strategic training platform built on top of LeetCode. Sync your solved problems, generate custom timed contests from your weakest topics, and track your progress — all in one dark-mode dashboard.

## Features

### Implemented
- **LeetCode Sync** — Verify ownership of your LeetCode account via a token pasted in your profile bio, then pull your last 50 accepted submissions into the local database with real difficulty and topic tags.
- **Custom Contest Engine** — Pick topics, difficulty, number of questions, and duration. The app selects problems you haven't solved yet, starts a countdown timer, and lets you verify progress via the LeetCode API.

### Planned
- **Upsolving Tracker** — Flag contest problems you missed and queue them for review.
- **AI Weakness Analysis** — Feed your tag distribution to an LLM and get a personalised blind-spot report.
- **Static Complexity Analyzer** — Paste any code snippet and get Time/Space complexity and optimization tips.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon) via Prisma v7 |
| Auth | Auth.js v5 (GitHub + Google OAuth) |
| AI (planned) | Langchain + OpenRouter |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) (or any PostgreSQL) database
- GitHub and/or Google OAuth app credentials

### Environment variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://..."

AUTH_SECRET="..."
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
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
  page.tsx                    # Landing page
  dashboard/
    page.tsx                  # Overview — stats cards + quick actions
    layout.tsx                # Sidebar navigation
    sync/
      page.tsx                # LeetCode sync server component
      SyncPanel.tsx           # Verification + sync UI (client)
    contest/
      page.tsx                # Contest creation form server component
      ContestForm.tsx         # Form UI — topics, difficulty, quantity, duration (client)
      [id]/
        page.tsx              # Contest room server component
        ContestRoom.tsx       # Countdown timer + question list (client)
  api/
    auth/[...nextauth]/       # Auth.js route handler
    user/verify-leetcode/     # Generate + verify ownership token
    leetcode/sync/            # Pull accepted submissions from LeetCode
    leetcode/contest/         # Fetch LeetCode contest history
    contest/create/           # Create a ContestSession with unsolved questions
    contest/[id]/sync/        # Verify solved questions via LeetCode API
    contest/[id]/end/         # Abandon a contest session
lib/
  leetcode.ts                 # LeetCode GraphQL helpers
  prisma.ts                   # Prisma singleton with pg driver adapter
prisma/
  schema.prisma               # Database schema
```

## Database Schema (key models)

```
User            — auth + leetcodeUsername + leetcodeVerifyToken
Question        — leetcodeId, slug, title, difficulty, tags[]
UserSolved      — userId + questionId + solvedAt + language
ContestSession  — userId, topics[], difficulty, quantity, durationMinutes, status
ContestQuestion — contestSessionId + questionId + solved
```

## How the contest flow works

1. User selects topics, difficulty, question count, and duration on `/dashboard/contest`.
2. The server queries all `Question` rows the user has no `UserSolved` record for, shuffles them, and creates a `ContestSession` with up to the requested number of `ContestQuestion` rows.
3. The user is redirected to `/dashboard/contest/[id]` where a countdown timer runs client-side, computed from the stored `startedAt` timestamp — so it survives page refreshes.
4. Clicking **Sync Progress** calls the LeetCode GraphQL API (`recentAcSubmissionList`) for each unsolved question. Solved ones are marked in the database. If all are solved, the session is automatically completed.
5. Clicking **End Contest** marks the session as abandoned.

## Notes

- The LeetCode sync checks your **50 most recent** accepted submissions. Problems solved more than 50 ACs ago will not be detected by Sync Progress.
- Prisma v7 requires a driver adapter — this project uses `@prisma/adapter-pg`. The generated client lives at `app/generated/prisma/` (not `node_modules/.prisma/client`).
