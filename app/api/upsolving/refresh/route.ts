import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getContestRankingHistory,
  getContestDetails,
  getRecentSubmissions,
  getQuestionDetail,
} from "@/lib/leetcode";
import type { Difficulty } from "@/app/generated/prisma/client";

function mapDifficulty(d: string | undefined): Difficulty {
  if (d === "Easy") return "EASY";
  if (d === "Hard") return "HARD";
  return "MEDIUM";
}

function contestTitleToSlug(title: string) {
  return title.toLowerCase().replace(/\s+/g, "-");
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true },
  });
  if (!user?.leetcodeUsername) return NextResponse.json({ error: "No LeetCode username" }, { status: 400 });

  // 1. Auto-sync recent ACs into UserSolved (public API, no cookie needed).
  try {
    const recent = await getRecentSubmissions(user.leetcodeUsername, 20);
    for (const sub of recent.recentAcSubmissionList) {
      const q = await prisma.question.findUnique({ where: { slug: sub.titleSlug } });
      if (!q) continue;
      await prisma.userSolved.upsert({
        where: { userId_questionId: { userId: session.user.id, questionId: q.id } },
        update: { solvedAt: new Date(parseInt(sub.timestamp) * 1000), language: sub.lang },
        create: {
          userId: session.user.id,
          questionId: q.id,
          solvedAt: new Date(parseInt(sub.timestamp) * 1000),
          language: sub.lang,
        },
      });
    }
  } catch {
    // Non-fatal — fall through with whatever we have.
  }

  // 2. Build solved-slug set from accumulated UserSolved.
  const solved = await prisma.userSolved.findMany({
    where: { userId: session.user.id },
    select: { question: { select: { slug: true } } },
  });
  const solvedSlugs = new Set(solved.map((s) => s.question.slug));

  // 3. Pull contest history with per-contest solve counts.
  let history;
  try {
    history = await getContestRankingHistory(user.leetcodeUsername);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Could not fetch contest history: ${msg}` }, { status: 502 });
  }

  const attended = history.userContestRankingHistory
    .filter((c) => c.attended)
    .sort((a, b) => b.contest.startTime - a.contest.startTime)
    .slice(0, 10);

  let added = 0;

  for (const entry of attended) {
    // Short-circuit: user cleared the whole contest — nothing to upsolve.
    if (entry.totalProblems > 0 && entry.problemsSolved === entry.totalProblems) continue;

    const slug = contestTitleToSlug(entry.contest.title);
    const contestDate = new Date(entry.contest.startTime * 1000);

    let details;
    try {
      details = await getContestDetails(slug);
    } catch {
      continue;
    }
    if (!details.questions?.length) continue;
    await new Promise((r) => setTimeout(r, 200));

    for (const q of details.questions) {
      if (solvedSlugs.has(q.title_slug)) continue;

      let question = await prisma.question.findUnique({ where: { slug: q.title_slug } });
      if (!question) {
        const leetcodeId = parseInt(q.question_id);
        if (isNaN(leetcodeId)) continue;

        let difficulty: Difficulty = "MEDIUM";
        let tags: string[] = [];
        try {
          const detail = await getQuestionDetail(q.title_slug);
          difficulty = mapDifficulty(detail.question.difficulty);
          tags = detail.question.topicTags.map((t) => t.name);
        } catch {
          // Detail fetch failed — fall through and create with defaults; will be refined on next sync.
        }

        try {
          question = await prisma.question.upsert({
            where: { leetcodeId },
            update: { slug: q.title_slug, title: q.title, difficulty, tags },
            create: { leetcodeId, slug: q.title_slug, title: q.title, difficulty, tags },
          });
        } catch {
          continue;
        }
      }

      try {
        await prisma.upsolvingItem.create({
          data: {
            userId: session.user.id,
            questionId: question.id,
            contestTitle: entry.contest.title,
            contestDate,
          },
        });
        added++;
      } catch {
        // Unique constraint (userId, questionId) — already there (active or dismissed); leave it.
      }
    }
  }

  const total = await prisma.upsolvingItem.count({
    where: { userId: session.user.id, dismissed: false },
  });
  return NextResponse.json({ added, total });
}
