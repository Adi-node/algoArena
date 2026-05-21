import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ContestForm from "./ContestForm";
import PastContestsButton from "./PastContestsButton";

export default async function ContestPage() {
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
          <h1 className="text-xl font-semibold text-white mb-1">Custom Contest</h1>
          <p className="text-sm text-[#737373]">Build a timed session around your weak spots.</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <p className="text-sm font-semibold text-yellow-400 mb-1">LeetCode account required</p>
          <p className="text-xs text-[#737373] mb-4">
            Connect and sync your LeetCode account first so we can pick unsolved problems for you.
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

  const rows = await prisma.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT unnest(tags) AS tag FROM "Question" ORDER BY tag
  `;
  const availableTags = rows.map((r) => r.tag);

  if (availableTags.length === 0) {
    return (
      <div className="p-8 max-w-xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white mb-1">Custom Contest</h1>
          <p className="text-sm text-[#737373]">Build a timed session around your weak spots.</p>
        </div>
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-semibold text-white">Question bank is empty</p>
          <p className="text-xs text-[#737373]">
            Run <code className="text-indigo-400 font-mono">npm run seed:questions</code> once to populate the question bank, then return here.
          </p>
        </div>
      </div>
    );
  }

  const pastContests = await prisma.contestSession.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["COMPLETED", "ABANDONED"] },
    },
    select: {
      id: true,
      topics: true,
      difficulty: true,
      durationMinutes: true,
      startedAt: true,
      completedAt: true,
      status: true,
      questions: { select: { solved: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  const serializedPast = pastContests.map((c) => ({
    id: c.id,
    topics: c.topics,
    difficulty: c.difficulty,
    durationMinutes: c.durationMinutes,
    status: c.status as "COMPLETED" | "ABANDONED",
    when: (c.completedAt ?? c.startedAt).toISOString(),
    solved: c.questions.filter((q) => q.solved).length,
    total: c.questions.length,
  }));

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-white mb-1">Custom Contest</h1>
          <p className="text-sm text-[#737373]">
            Pick topics, difficulty, and duration — we&apos;ll find unsolved problems for you.
          </p>
        </div>
        <PastContestsButton contests={serializedPast} />
      </div>
      <ContestForm availableTags={availableTags} />
    </div>
  );
}
