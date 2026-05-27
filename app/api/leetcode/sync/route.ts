import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecentSubmissions, getQuestionDetail, leetcodeUserTag } from "@/lib/leetcode";
import type { Difficulty } from "@/app/generated/prisma/client";

function mapDifficulty(d: string): Difficulty {
  if (d === "Easy") return "EASY";
  if (d === "Hard") return "HARD";
  return "MEDIUM";
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.leetcodeUsername) {
    return NextResponse.json(
      { error: "No verified LeetCode username. Complete verification first." },
      { status: 400 }
    );
  }

  let submissions;
  try {
    const data = await getRecentSubmissions(user.leetcodeUsername, 20);
    submissions = data.recentAcSubmissionList;
  } catch {
    return NextResponse.json({ error: "Could not fetch submissions from LeetCode." }, { status: 502 });
  }

  const detailResults = await Promise.all(
    submissions.map((sub) =>
      getQuestionDetail(sub.titleSlug)
        .then((d) => ({
          difficulty: mapDifficulty(d.question.difficulty),
          tags: d.question.topicTags.map((t) => t.name),
        }))
        .catch(() => ({ difficulty: "MEDIUM" as Difficulty, tags: [] as string[] }))
    )
  );

  const questions = await prisma.$transaction(
    submissions.map((sub, i) =>
      prisma.question.upsert({
        where: { slug: sub.titleSlug },
        update: { difficulty: detailResults[i].difficulty, tags: detailResults[i].tags },
        create: {
          leetcodeId: parseInt(sub.id),
          slug: sub.titleSlug,
          title: sub.title,
          difficulty: detailResults[i].difficulty,
          tags: detailResults[i].tags,
        },
      })
    )
  );

  await prisma.$transaction(
    submissions.map((sub, i) =>
      prisma.userSolved.upsert({
        where: { userId_questionId: { userId: user.id, questionId: questions[i].id } },
        update: { solvedAt: new Date(parseInt(sub.timestamp) * 1000), language: sub.lang },
        create: {
          userId: user.id,
          questionId: questions[i].id,
          solvedAt: new Date(parseInt(sub.timestamp) * 1000),
          language: sub.lang,
        },
      })
    )
  );

  revalidateTag(leetcodeUserTag(session.user.id), "max");
  return NextResponse.json({ synced: submissions.length });
}
