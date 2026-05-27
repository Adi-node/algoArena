import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecentSubmissions } from "@/lib/leetcode";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await req.json();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.leetcodeUsername) {
    return NextResponse.json(
      { error: "No LeetCode username set." },
      { status: 400 }
    );
  }

  const data = await getRecentSubmissions(user.leetcodeUsername, 50);
  const solved = data.recentAcSubmissionList.some((s) => s.titleSlug === slug);
  return NextResponse.json({ slug, solved });
}
