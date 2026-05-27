import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestion, isCategory } from "@/lib/practice";
import PracticeRoom from "./PracticeRoom";

export default async function PracticeQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const { category, id } = await params;
  if (!isCategory(category)) notFound();

  const question = await getQuestion(category, id);
  if (!question) notFound();

  const { attempt: attemptId } = await searchParams;
  let initialCode = question.starterCode;
  if (attemptId) {
    const a = await prisma.practiceAttempt.findFirst({
      where: { id: attemptId, userId: session.user.id, questionId: id },
    });
    if (a) initialCode = a.code;
  }

  return (
    <PracticeRoom
      questionId={question.id}
      category={question.category}
      title={question.title}
      description={question.description}
      difficulty={question.difficulty}
      initialCode={initialCode}
    />
  );
}
