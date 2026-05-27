import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SyncPanel from "./SyncPanel";

export default async function SyncPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const [user, syncedCount, lastSolved] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true, leetcodeVerifyToken: true },
    }),
    prisma.userSolved.count({
      where: { userId: session.user.id },
    }),
    prisma.userSolved.findFirst({
      where: { userId: session.user.id },
      orderBy: { solvedAt: "desc" },
      select: { solvedAt: true },
    }),
  ]);

  return (
    <>
      <header className="aa-page-head">
        <h1>LeetCode sync</h1>
        <p className="sub">Connect your LeetCode account and pull your accepted submissions into Algo Arena.</p>
      </header>

      <SyncPanel
        currentUsername={user?.leetcodeUsername ?? null}
        syncedCount={syncedCount}
        lastSyncedAt={lastSolved?.solvedAt ?? null}
      />
    </>
  );
}
