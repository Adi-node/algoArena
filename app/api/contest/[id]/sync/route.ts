import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkSubmission } from "@/lib/leetcode";

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

  const updatedQuestions = contest.questions.map((q) => ({ ...q }));

  for (const cq of updatedQuestions) {
    if (cq.solved) continue;
    const isSolved = await checkSubmission(user.leetcodeUsername, cq.question.slug);
    if (isSolved) {
      await prisma.contestQuestion.update({ where: { id: cq.id }, data: { solved: true } });
      cq.solved = true;
    }
  }

  const allSolved = updatedQuestions.every((q) => q.solved);
  let newStatus: "ACTIVE" | "COMPLETED" | "ABANDONED" = contest.status;
  if (allSolved) {
    await prisma.contestSession.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    newStatus = "COMPLETED";
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
    status: newStatus,
  });
}
