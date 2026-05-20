import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllSolvedSlugs, getQuestionDetail } from "@/lib/leetcode";
import type { Difficulty } from "@/app/generated/prisma/client";

function mapDifficulty(d: string): Difficulty {
  if (d === "Easy") return "EASY";
  if (d === "Hard") return "HARD";
  return "MEDIUM";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leetcodeSession } = (await req.json()) as { leetcodeSession?: string };
  if (!leetcodeSession?.trim()) {
    return NextResponse.json({ error: "LEETCODE_SESSION required" }, { status: 400 });
  }

  let slugs: string[];
  try {
    slugs = await fetchAllSolvedSlugs(leetcodeSession.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch from LeetCode";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let added = 0;
  for (const slug of slugs) {
    let q = await prisma.question.findUnique({ where: { slug } });
    if (!q) {
      try {
        const detail = await getQuestionDetail(slug);
        const idNum = parseInt(detail.question.questionId);
        if (isNaN(idNum)) continue;
        q = await prisma.question.upsert({
          where: { leetcodeId: idNum },
          update: { slug, title: detail.question.title },
          create: {
            leetcodeId: idNum,
            slug,
            title: detail.question.title,
            difficulty: mapDifficulty(detail.question.difficulty),
            tags: detail.question.topicTags.map((t) => t.name),
          },
        });
      } catch {
        continue;
      }
    }
    try {
      await prisma.userSolved.create({
        data: {
          userId: session.user.id,
          questionId: q.id,
          solvedAt: new Date(),
          language: "",
        },
      });
      added++;
    } catch {
      // Unique constraint (userId, questionId) — already recorded; skip.
    }
  }

  return NextResponse.json({ totalSlugs: slugs.length, added });
}
