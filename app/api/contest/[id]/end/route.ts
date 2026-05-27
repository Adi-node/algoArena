import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    select: { userId: true, status: true, startedAt: true, durationMinutes: true },
  });
  if (!contest || contest.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (contest.status !== "ACTIVE") {
    return NextResponse.json({ status: contest.status, alreadyEnded: true });
  }

  const elapsedMs = Date.now() - contest.startedAt.getTime();
  const durationMs = contest.durationMinutes * 60_000;
  const newStatus: "COMPLETED" | "ABANDONED" =
    elapsedMs >= durationMs ? "COMPLETED" : "ABANDONED";

  const updated = await prisma.contestSession.updateMany({
    where: { id, status: "ACTIVE" },
    data: { status: newStatus, completedAt: new Date() },
  });

  if (updated.count === 0) {
    const current = await prisma.contestSession.findUnique({
      where: { id },
      select: { status: true },
    });
    return NextResponse.json({ status: current?.status ?? newStatus, alreadyEnded: true });
  }

  return NextResponse.json({ status: newStatus });
}
