import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecentSubmissions } from "@/lib/leetcode";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contest = await prisma.contestSession.findUnique({
    where: { id },
    include: {
      questions: {
        include: { question: { select: { slug: true, title: true, difficulty: true } } },
      },
    },
  });
  if (!contest || contest.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (contest.status !== "ACTIVE") {
    return NextResponse.json({ error: "Contest is not active" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true },
  });
  if (!user?.leetcodeUsername) {
    return NextResponse.json({ error: "No LeetCode username configured" }, { status: 400 });
  }

  let acSlugs: Set<string>;
  try {
    const data = await getRecentSubmissions(user.leetcodeUsername, 50);
    acSlugs = new Set(data.recentAcSubmissionList.map((s) => s.titleSlug));
  } catch {
    return NextResponse.json({ error: "Could not reach LeetCode. Try again." }, { status: 502 });
  }

  const newlySolved = contest.questions.filter(
    (cq) => !cq.solved && acSlugs.has(cq.question.slug)
  );

  const updatedQuestions = contest.questions.map((q) => ({
    ...q,
    solved: q.solved || acSlugs.has(q.question.slug),
  }));
  const allSolved = updatedQuestions.every((q) => q.solved);
  const shouldComplete = allSolved;

  if (newlySolved.length > 0 || shouldComplete) {
    await prisma.$transaction(async (tx) => {
      for (const cq of newlySolved) {
        await tx.contestQuestion.update({ where: { id: cq.id }, data: { solved: true } });
      }
      if (shouldComplete) {
        await tx.contestSession.updateMany({
          where: { id, status: "ACTIVE" },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }
    }, { timeout: 15_000 });
  }

  return NextResponse.json({
    questions: updatedQuestions.map((q) => ({
      id: q.id,
      questionId: q.questionId,
      solved: q.solved,
      question: {
        slug: q.question.slug,
        title: q.question.title,
        difficulty: q.question.difficulty,
      },
    })),
    status: shouldComplete ? "COMPLETED" : contest.status,
  });
}
