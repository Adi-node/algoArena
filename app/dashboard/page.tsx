import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getContestHistory } from "@/lib/leetcode";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const [user, totalSolved, upsolveCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true, name: true },
    }),
    prisma.userSolved.count({ where: { userId: session.user.id } }),
    prisma.upsolvingItem.count({ where: { userId: session.user.id, dismissed: false } }),
  ]);

  let contestRating: number | null = null;
  if (user?.leetcodeUsername) {
    try {
      const history = await getContestHistory(user.leetcodeUsername);
      contestRating = history.userContestRanking?.rating
        ? Math.round(history.userContestRanking.rating)
        : null;
    } catch {
      // Non-fatal: leave as null
    }
  }

  const stats = [
    {
      label: "Total Solved",
      value: totalSolved > 0 ? String(totalSolved) : "—",
      sub: totalSolved > 0 ? "problems synced" : "Sync your LeetCode",
      color: "text-indigo-400",
      href: "/dashboard/sync",
    },
    {
      label: "Contest Rating",
      value: contestRating ? String(contestRating) : "—",
      sub: contestRating ? "current rating" : user?.leetcodeUsername ? "No contests yet" : "Connect LeetCode",
      color: "text-purple-400",
      href: "/dashboard/sync",
    },
    {
      label: "Upsolve Queue",
      value: String(upsolveCount),
      sub: upsolveCount > 0 ? "problems to review" : "Refresh to populate",
      color: "text-yellow-400",
      href: "/dashboard/upsolving",
    },
    {
      label: "Weakest Tag",
      value: "—",
      sub: "Run AI analysis",
      color: "text-green-400",
      href: "/dashboard/analysis",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white mb-1">
          {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Overview"}
        </h1>
        <p className="text-sm text-[#737373]">Your DSA progress at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-5 hover:border-[#2f2f2f] transition-colors"
          >
            <p className="text-xs text-[#737373] mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
            <p className="text-xs text-[#4a4a4a]">{stat.sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: "Sync LeetCode",
            desc: user?.leetcodeUsername
              ? `Pull latest submissions for @${user.leetcodeUsername}`
              : "Connect your account and pull solved problems.",
            href: "/dashboard/sync",
            accent: "text-indigo-400",
            bg: "bg-indigo-600/5",
            border: "border-indigo-500/20",
          },
          {
            label: "Start a Contest",
            desc: "Build a custom timed session around your weak spots.",
            href: "/dashboard/contest",
            accent: "text-purple-400",
            bg: "bg-purple-600/5",
            border: "border-purple-500/20",
          },
          {
            label: "AI Report",
            desc: "Get a personalized blind spot analysis from your data.",
            href: "/dashboard/analysis",
            accent: "text-green-400",
            bg: "bg-green-600/5",
            border: "border-green-500/20",
          },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`rounded-2xl border ${action.border} ${action.bg} p-6 flex flex-col gap-3 hover:brightness-125 transition-all`}
          >
            <h3 className={`text-sm font-semibold ${action.accent}`}>{action.label}</h3>
            <p className="text-xs text-[#737373] leading-relaxed">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
