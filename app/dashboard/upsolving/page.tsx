import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UpsolvingQueue from "./UpsolvingQueue";

export default async function UpsolvingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true },
  });

  if (!user?.leetcodeUsername) {
    return (
      <div className="p-8 max-w-xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white mb-1">Upsolving Queue</h1>
          <p className="text-sm text-[#737373]">Problems from your recent contests that you haven&apos;t solved yet.</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <p className="text-sm font-semibold text-yellow-400 mb-1">LeetCode account required</p>
          <p className="text-xs text-[#737373] mb-4">
            Connect and sync your LeetCode account so we can pull your contest history.
          </p>
          <Link
            href="/dashboard/sync"
            className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Go to LeetCode Sync
          </Link>
        </div>
      </div>
    );
  }

  const items = await prisma.upsolvingItem.findMany({
    where: { userId: session.user.id, dismissed: false },
    include: { question: { select: { slug: true, title: true, difficulty: true } } },
    orderBy: [{ contestDate: "desc" }, { addedAt: "asc" }],
  });

  const serialized = items.map((i) => ({
    id: i.id,
    contestTitle: i.contestTitle,
    contestDate: i.contestDate.toISOString(),
    question: i.question,
  }));

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white mb-1">Upsolving Queue</h1>
        <p className="text-sm text-[#737373]">
          Problems from your recent contests that you haven&apos;t solved yet.
        </p>
      </div>
      <UpsolvingQueue items={serialized} />
    </div>
  );
}
