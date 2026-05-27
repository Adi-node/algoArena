import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getContestHistory } from "@/lib/leetcode";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.leetcodeUsername) {
    return NextResponse.json(
      { error: "No LeetCode username set." },
      { status: 400 }
    );
  }

  const data = await getContestHistory(user.leetcodeUsername, session.user.id);
  return NextResponse.json(data);
}
