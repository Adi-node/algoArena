import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@/app/generated/prisma/client";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true },
  });
  if (!user?.leetcodeUsername) {
    return NextResponse.json(
      { error: "Verify your LeetCode account first." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { topics, difficulty, quantity, durationMinutes } = body as {
    topics: string[];
    difficulty: Difficulty | null;
    quantity: number;
    durationMinutes: number;
  };

  if (typeof quantity !== "number" || quantity < 1 || quantity > 10) {
    return NextResponse.json({ error: "quantity must be 1–10" }, { status: 400 });
  }
  if (![30, 60, 90, 120].includes(durationMinutes)) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const candidates = await prisma.question.findMany({
    where: {
      ...(topics && topics.length > 0 ? { tags: { hasSome: topics } } : {}),
      ...(difficulty ? { difficulty } : {}),
      solvedBy: { none: { userId: session.user.id } },
    },
    select: { id: true, slug: true, title: true, difficulty: true, tags: true },
  });

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "No unsolved questions match your criteria. Try different filters or sync more problems." },
      { status: 422 }
    );
  }

  const selected = shuffle(candidates).slice(0, quantity);

  const contest = await prisma.contestSession.create({
    data: {
      userId: session.user.id,
      topics: topics ?? [],
      difficulty: difficulty ?? null,
      quantity: selected.length,
      durationMinutes,
      questions: {
        create: selected.map((q) => ({ questionId: q.id })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ contestId: contest.id });
}
