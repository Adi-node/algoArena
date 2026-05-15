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
    select: { userId: true, status: true },
  });
  if (!contest || contest.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (contest.status !== "ACTIVE") {
    return NextResponse.json({ error: "Contest already ended" }, { status: 400 });
  }

  await prisma.contestSession.update({
    where: { id },
    data: { status: "ABANDONED", completedAt: new Date() },
  });

  return NextResponse.json({ status: "ABANDONED" });
}
