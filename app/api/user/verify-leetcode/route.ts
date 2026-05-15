import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/leetcode";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, username } = await req.json();

  if (action === "generate") {
    if (!username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Verify the username exists on LeetCode before generating token
    try {
      const data = await getUserProfile(username.trim());
      if (!data.matchedUser) {
        return NextResponse.json({ error: "LeetCode user not found" }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: "Could not reach LeetCode. Try again." }, { status: 502 });
    }

    const token = `ALGO-ARENA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { leetcodeVerifyToken: token },
    });

    return NextResponse.json({ token });
  }

  if (action === "verify") {
    if (!username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeVerifyToken: true },
    });

    if (!user?.leetcodeVerifyToken) {
      return NextResponse.json({ error: "No pending token. Generate one first." }, { status: 400 });
    }

    let aboutMe = "";
    try {
      const data = await getUserProfile(username.trim());
      aboutMe = data.matchedUser?.profile?.aboutMe ?? "";
    } catch {
      return NextResponse.json({ error: "Could not reach LeetCode. Try again." }, { status: 502 });
    }

    if (!aboutMe.includes(user.leetcodeVerifyToken)) {
      return NextResponse.json({
        verified: false,
        error: "Token not found in your LeetCode About Me. Make sure you saved the profile.",
      });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { leetcodeUsername: username.trim(), leetcodeVerifyToken: null },
    });

    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
