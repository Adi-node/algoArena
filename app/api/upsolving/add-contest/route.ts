import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getContestDetails, getQuestionDetail } from "@/lib/leetcode";
import type { Difficulty } from "@/app/generated/prisma/client";

function mapDifficulty(d: string | undefined): Difficulty {
  if (d === "Easy") return "EASY";
  if (d === "Hard") return "HARD";
  return "MEDIUM";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { leetcodeUsername: true },
  });
  if (!user?.leetcodeUsername) return NextResponse.json({ error: "No LeetCode username" }, { status: 400 });

  const { contestSlug } = (await req.json()) as { contestSlug: string };
  if (!contestSlug?.trim()) return NextResponse.json({ error: "contestSlug required" }, { status: 400 });

  let details;
  try {
    details = await getContestDetails(contestSlug.trim());
  } catch {
    return NextResponse.json(
      { error: `Contest "${contestSlug}" not found. Check the slug and try again.` },
      { status: 404 }
    );
  }
  if (!details.questions?.length) {
    return NextResponse.json({ error: "No problems found for this contest." }, { status: 404 });
  }

  const contestTitle = details.contest?.title ?? contestSlug;
  const contestDate = details.contest?.startTime
    ? new Date(details.contest.startTime * 1000)
    : new Date();

  // Filter out questions the user already has solved.
  const solved = await prisma.userSolved.findMany({
    where: { userId },
    select: { question: { select: { slug: true } } },
  });
  const solvedSlugs = new Set(solved.map((s) => s.question.slug));

  type Candidate = { slug: string; title: string; leetcodeId: number };
  const candidates: Candidate[] = [];
  for (const q of details.questions) {
    if (solvedSlugs.has(q.title_slug)) continue;
    const leetcodeId = parseInt(q.question_id);
    if (isNaN(leetcodeId)) continue;
    candidates.push({ slug: q.title_slug, title: q.title, leetcodeId });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ added: 0, contestTitle });
  }

  // Batched lookup of existing Question rows.
  const existingQs = await prisma.question.findMany({
    where: { slug: { in: candidates.map((c) => c.slug) } },
    select: { id: true, slug: true },
  });
  const slugToQuestionId = new Map(existingQs.map((q) => [q.slug, q.id]));

  // Parallel detail fetch only for unseen candidates (real difficulty + tags).
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

  // Create missing Question rows in one transaction.
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

  // Find currently-existing UpsolvingItem rows so we can count "actually new" vs "undismissed".
  const questionIds = candidates
    .map((c) => slugToQuestionId.get(c.slug))
    .filter((id): id is string => !!id);
  const preExisting = await prisma.upsolvingItem.findMany({
    where: { userId, questionId: { in: questionIds } },
    select: { questionId: true, dismissed: true },
  });
  const preMap = new Map(preExisting.map((p) => [p.questionId, p.dismissed]));

  // Upsert: create new rows OR undismiss previously-dismissed ones; skip if already active.
  const writes = candidates
    .map((c) => slugToQuestionId.get(c.slug))
    .filter((id): id is string => !!id)
    .filter((id) => preMap.get(id) !== false) // skip if exists and not dismissed
    .map((questionId) =>
      prisma.upsolvingItem.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: { dismissed: false },
        create: { userId, questionId, contestTitle, contestDate },
      })
    );

  if (writes.length > 0) await prisma.$transaction(writes);

  return NextResponse.json({ added: writes.length, contestTitle });
}
