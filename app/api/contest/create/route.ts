import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@/app/generated/prisma/client";

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

  // Refuse to start a second contest while one is still ACTIVE.
  // The client is expected to redirect to /dashboard/contest/<existingContestId>.
  const existing = await prisma.contestSession.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have an active contest.", existingContestId: existing.id },
      { status: 409 }
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

  // Pull `quantity` random unsolved questions matching the filter, in one SQL pass.
  // Pushes shuffle + slice into Postgres instead of dragging the whole unsolved set into Node.
  const topicsArr = (topics ?? []).filter((t) => typeof t === "string");
  const topicsClause =
    topicsArr.length > 0
      ? Prisma.sql`AND q.tags && ${topicsArr}::text[]`
      : Prisma.empty;
  const difficultyClause = difficulty
    ? Prisma.sql`AND q.difficulty = ${difficulty}::"Difficulty"`
    : Prisma.empty;

  const selected = await prisma.$queryRaw<
    { id: string; slug: string; title: string; difficulty: Difficulty; tags: string[] }[]
  >`
    SELECT q.id, q.slug, q.title, q.difficulty, q.tags
    FROM "Question" q
    WHERE NOT EXISTS (
      SELECT 1 FROM "UserSolved" us
      WHERE us."questionId" = q.id AND us."userId" = ${session.user.id}
    )
    ${topicsClause}
    ${difficultyClause}
    ORDER BY random()
    LIMIT ${quantity}
  `;

  if (selected.length === 0) {
    return NextResponse.json(
      { error: "No unsolved questions match your criteria. Try different filters or sync more problems." },
      { status: 422 }
    );
  }

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
