import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SyncPanel from "./SyncPanel";

export default async function SyncPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true, leetcodeVerifyToken: true },
  });

  const syncedCount = await prisma.userSolved.count({
    where: { userId: session.user.id },
  });

  const lastSolved = await prisma.userSolved.findFirst({
    where: { userId: session.user.id },
    orderBy: { solvedAt: "desc" },
    select: { solvedAt: true },
  });

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white mb-1">LeetCode Sync</h1>
        <p className="text-sm text-[#737373]">
          Connect your LeetCode account and pull your accepted submissions into Algo Arena.
        </p>
      </div>

      <SyncPanel
        currentUsername={user?.leetcodeUsername ?? null}
        syncedCount={syncedCount}
        lastSyncedAt={lastSolved?.solvedAt ?? null}
      />
    </div>
  );
}
