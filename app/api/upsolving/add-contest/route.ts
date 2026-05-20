import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getContestDetails } from "@/lib/leetcode";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true },
  });
  if (!user?.leetcodeUsername) return NextResponse.json({ error: "No LeetCode username" }, { status: 400 });

  const { contestSlug } = (await req.json()) as { contestSlug: string };
  if (!contestSlug?.trim()) return NextResponse.json({ error: "contestSlug required" }, { status: 400 });

  let details;
  try {
    details = await getContestDetails(contestSlug.trim());
  } catch {
    return NextResponse.json({ error: `Contest "${contestSlug}" not found. Check the slug and try again.` }, { status: 404 });
  }

  if (!details.questions?.length) {
    return NextResponse.json({ error: "No problems found for this contest." }, { status: 404 });
  }

  const solved = await prisma.userSolved.findMany({
    where: { userId: session.user.id },
    select: { question: { select: { slug: true } } },
  });
  const solvedSlugs = new Set(solved.map((s) => s.question.slug));

  const contestTitle = details.contest?.title ?? contestSlug;
  const contestDate = details.contest?.startTime
    ? new Date(details.contest.startTime * 1000)
    : new Date();
  let added = 0;

  for (const q of details.questions) {
    if (solvedSlugs.has(q.title_slug)) continue;

    let question = await prisma.question.findUnique({ where: { slug: q.title_slug } });
    if (!question) {
      const leetcodeId = parseInt(q.question_id);
      if (isNaN(leetcodeId)) continue;
      try {
        question = await prisma.question.upsert({
          where: { leetcodeId },
          update: { slug: q.title_slug, title: q.title },
          create: { leetcodeId, slug: q.title_slug, title: q.title, difficulty: "MEDIUM", tags: [] },
        });
      } catch { continue; }
    }

    await prisma.upsolvingItem.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId: question.id } },
      update: {},
      create: {
        userId: session.user.id,
        questionId: question.id,
        contestTitle,
        contestDate,
      },
    });
    added++;
  }

  return NextResponse.json({ added, contestTitle });
}
