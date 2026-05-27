import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ContestRoom from "./ContestRoom";

export default async function ContestRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const [contest, user] = await Promise.all([
    prisma.contestSession.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              select: { id: true, slug: true, title: true, difficulty: true },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true },
    }),
  ]);

  if (!contest || contest.userId !== session.user.id) {
    notFound();
  }

  return (
    <ContestRoom
      contestId={contest.id}
      startedAt={contest.startedAt.toISOString()}
      durationMinutes={contest.durationMinutes}
      status={contest.status}
      initialQuestions={contest.questions.map((cq) => ({
        id: cq.id,
        questionId: cq.questionId,
        solved: cq.solved,
        question: {
          slug: cq.question.slug,
          title: cq.question.title,
          difficulty: cq.question.difficulty,
        },
      }))}
      leetcodeUsername={user?.leetcodeUsername ?? null}
    />
  );
}
