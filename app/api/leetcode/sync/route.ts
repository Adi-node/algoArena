import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecentSubmissions, getQuestionDetail } from "@/lib/leetcode";
import type { Difficulty } from "@/app/generated/prisma/client";

function mapDifficulty(d: string): Difficulty {
  if (d === "Easy") return "EASY";
  if (d === "Hard") return "HARD";
  return "MEDIUM";
}

export async function POST(req: NextRequest) {
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
    const data = await getRecentSubmissions(user.leetcodeUsername, 50);
    submissions = data.recentAcSubmissionList;
  } catch {
    return NextResponse.json({ error: "Could not fetch submissions from LeetCode." }, { status: 502 });
  }

  let synced = 0;
  for (const sub of submissions) {
    let difficulty: Difficulty = "MEDIUM";
    let tags: string[] = [];

    try {
      const detail = await getQuestionDetail(sub.titleSlug);
      difficulty = mapDifficulty(detail.question.difficulty);
      tags = detail.question.topicTags.map((t) => t.name);
    } catch {
      // Non-fatal: keep defaults if detail fetch fails
    }

    const question = await prisma.question.upsert({
      where: { slug: sub.titleSlug },
      update: { difficulty, tags },
      create: {
        leetcodeId: parseInt(sub.id),
        slug: sub.titleSlug,
        title: sub.title,
        difficulty,
        tags,
      },
    });

    await prisma.userSolved.upsert({
      where: { userId_questionId: { userId: user.id, questionId: question.id } },
      update: { solvedAt: new Date(parseInt(sub.timestamp) * 1000), language: sub.lang },
      create: {
        userId: user.id,
        questionId: question.id,
        solvedAt: new Date(parseInt(sub.timestamp) * 1000),
        language: sub.lang,
      },
    });
    synced++;
  }

  return NextResponse.json({ synced });
}
