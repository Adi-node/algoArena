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

  // 1. Auto-sync recent ACs into UserSolved (single batch query + transactional upserts).
  try {
    const recent = await getRecentSubmissions(user.leetcodeUsername, 20);
    const subs = recent.recentAcSubmissionList;
    if (subs.length > 0) {
      const slugs = subs.map((s) => s.titleSlug);
      const existing = await prisma.question.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, slug: true },
      });
      const slugToId = new Map(existing.map((q) => [q.slug, q.id]));
      const writes = subs
        .filter((s) => slugToId.has(s.titleSlug))
        .map((s) =>
          prisma.userSolved.upsert({
            where: {
              userId_questionId: {
                userId: session.user!.id!,
                questionId: slugToId.get(s.titleSlug)!,
              },
            },
            update: { solvedAt: new Date(parseInt(s.timestamp) * 1000), language: s.lang },
            create: {
              userId: session.user!.id!,
              questionId: slugToId.get(s.titleSlug)!,
              solvedAt: new Date(parseInt(s.timestamp) * 1000),
              language: s.lang,
            },
          })
        );
      if (writes.length > 0) await prisma.$transaction(writes);
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
    .filter((c) => !(c.totalProblems > 0 && c.problemsSolved === c.totalProblems))
    .sort((a, b) => b.contest.startTime - a.contest.startTime)
    .slice(0, 10);

  // 4. Parallel fetch all contest details.
  const detailResults = await Promise.all(
    attended.map((entry) =>
      getContestDetails(contestTitleToSlug(entry.contest.title))
        .then((details) => ({ entry, details }))
        .catch(() => null)
    )
  );

  // 5. Gather all candidate (unsolved) question slugs across all contests.
  type Candidate = {
    slug: string;
    title: string;
    leetcodeId: number;
    contestTitle: string;
    contestDate: Date;
  };
  const candidates: Candidate[] = [];
  for (const result of detailResults) {
    if (!result) continue;
    const { entry, details } = result;
    if (!details.questions?.length) continue;
    const contestDate = new Date(entry.contest.startTime * 1000);
    for (const q of details.questions) {
      if (solvedSlugs.has(q.title_slug)) continue;
      const leetcodeId = parseInt(q.question_id);
      if (isNaN(leetcodeId)) continue;
      candidates.push({
        slug: q.title_slug,
        title: q.title,
        leetcodeId,
        contestTitle: entry.contest.title,
        contestDate,
      });
    }
  }

  if (candidates.length === 0) {
    const total = await prisma.upsolvingItem.count({
      where: { userId: session.user.id, dismissed: false },
    });
    return NextResponse.json({ added: 0, total });
  }

  // 6. One batched lookup for existing Question rows.
  const existingQs = await prisma.question.findMany({
    where: { slug: { in: candidates.map((c) => c.slug) } },
    select: { id: true, slug: true },
  });
  const slugToQuestionId = new Map(existingQs.map((q) => [q.slug, q.id]));

  // 7. Parallel detail fetch only for the candidates we need to create.
  const missing = candidates.filter((c) => !slugToQuestionId.has(c.slug));
  const missingDetails = await Promise.all(
    missing.map((c) =>
      getQuestionDetail(c.slug)
        .then((d) => ({
          difficulty: mapDifficulty(d.question.difficulty),
          tags: d.question.topicTags.map((t) => t.name),
        }))
        .catch(() => ({ difficulty: "MEDIUM" as Difficulty, tags: [] as string[] }))
    )
  );

  // 8. Create missing Question rows in one transaction (upsert by unique leetcodeId).
  if (missing.length > 0) {
    const created = await prisma.$transaction(
      missing.map((c, i) =>
        prisma.question.upsert({
          where: { leetcodeId: c.leetcodeId },
          update: { slug: c.slug, title: c.title, difficulty: missingDetails[i].difficulty, tags: missingDetails[i].tags },
          create: {
            leetcodeId: c.leetcodeId,
            slug: c.slug,
            title: c.title,
            difficulty: missingDetails[i].difficulty,
            tags: missingDetails[i].tags,
          },
        })
      )
    );
    created.forEach((q) => slugToQuestionId.set(q.slug, q.id));
  }

  // 9. Upsert UpsolvingItem rows in one transaction.
  const upsolveWrites = candidates
    .filter((c) => slugToQuestionId.has(c.slug))
    .map((c) =>
      prisma.upsolvingItem.upsert({
        where: {
          userId_questionId: {
            userId: session.user!.id!,
            questionId: slugToQuestionId.get(c.slug)!,
          },
        },
        update: {},
        create: {
          userId: session.user!.id!,
          questionId: slugToQuestionId.get(c.slug)!,
          contestTitle: c.contestTitle,
          contestDate: c.contestDate,
        },
      })
    );

  // Count pre-existing items so we can report new additions only.
  const preCount = await prisma.upsolvingItem.count({
    where: { userId: session.user.id, dismissed: false },
  });
  if (upsolveWrites.length > 0) await prisma.$transaction(upsolveWrites);
  const total = await prisma.upsolvingItem.count({
    where: { userId: session.user.id, dismissed: false },
  });

  return NextResponse.json({ added: Math.max(0, total - preCount), total });
}
