import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type BadgeKind = "AK" | "COMPLETED" | "TERMINATED";

function badgeStyle(kind: BadgeKind) {
  switch (kind) {
    case "AK":
      return "text-yellow-300 bg-yellow-500/10 border-yellow-500/30";
    case "COMPLETED":
      return "text-indigo-300 bg-indigo-500/10 border-indigo-500/30";
    case "TERMINATED":
      return "text-red-400 bg-red-500/10 border-red-500/30";
  }
}

function badgeLabel(kind: BadgeKind) {
  return kind === "AK" ? "AK" : kind === "COMPLETED" ? "Completed" : "Terminated";
}

export default async function ContestHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const contests = await prisma.contestSession.findMany({
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

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white mb-1">Past Contests</h1>
        <p className="text-sm text-[#737373]">Your finished custom contests and how you did.</p>
      </div>

      {contests.length === 0 ? (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.6">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">No past contests yet</p>
          <p className="text-xs text-[#737373] max-w-xs">
            Start a custom contest and your results will appear here once it ends.
          </p>
          <Link
            href="/dashboard/contest"
            className="mt-2 inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Start a Contest
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {contests.map((c) => {
            const total = c.questions.length;
            const solved = c.questions.filter((q) => q.solved).length;
            const isAK = c.status === "COMPLETED" && total > 0 && solved === total;
            const kind: BadgeKind =
              c.status === "ABANDONED" ? "TERMINATED" : isAK ? "AK" : "COMPLETED";
            const when = c.completedAt ?? c.startedAt;
            const difficultyLabel = c.difficulty
              ? c.difficulty.charAt(0) + c.difficulty.slice(1).toLowerCase()
              : "Mixed";
            const topicsLabel = c.topics.length > 0 ? c.topics.join(", ") : "Any topic";

            return (
              <Link
                key={c.id}
                href={`/dashboard/contest/${c.id}`}
                className="block rounded-2xl border border-[#1f1f1f] bg-[#111111] hover:border-[#2f2f2f] p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyle(kind)}`}
                      >
                        {badgeLabel(kind)}
                      </span>
                      <span className="text-xs text-[#737373]">{formatDate(when)}</span>
                    </div>
                    <p className="text-sm text-white truncate">
                      {solved}/{total} solved
                      <span className="text-[#4a4a4a]"> · </span>
                      <span className="text-[#a3a3a3]">{c.durationMinutes}m</span>
                      <span className="text-[#4a4a4a]"> · </span>
                      <span className="text-[#a3a3a3]">{difficultyLabel}</span>
                    </p>
                    <p className="text-xs text-[#737373] mt-1 truncate">{topicsLabel}</p>
                  </div>
                  <span className="text-xs text-[#4a4a4a] shrink-0 mt-1">Review →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
