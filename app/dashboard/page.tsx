import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getContestHistory } from "@/lib/leetcode";
import RatingPanel, { RatingPanelSkeleton } from "./RatingPanel";
import HeatmapPanel, { HeatmapPanelSkeleton } from "./HeatmapPanel";
import { Icon } from "../_ui/icons";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  href: string;
  mono?: boolean;
}

function StatCard({ label, value, sub, href, mono }: StatCardProps) {
  return (
    <Link href={href} className="aa-stat">
      <div className="label">{label}</div>
      <div className={"value" + (mono ? " mono" : "")}>{value}</div>
      <div className="foot"><span>{sub}</span></div>
    </Link>
  );
}

async function RatingStatCard({ username }: { username: string }) {
  const h = await getContestHistory(username).catch(() => null);
  const rating = h?.userContestRanking?.rating ? Math.round(h.userContestRanking.rating) : null;
  const attended = (h?.userContestRankingHistory ?? []).filter((c) => c.attended).length;
  return (
    <StatCard
      label="Contest Rating"
      value={rating ?? "—"}
      sub={
        !h
          ? "Connect LeetCode"
          : attended > 0
          ? `${attended} contest${attended === 1 ? "" : "s"} attended`
          : "No contests yet"
      }
      href="/dashboard/sync"
    />
  );
}

function RatingStatSkeleton() {
  return (
    <StatCard
      label="Contest Rating"
      value={<span className="aa-skel-text" style={{ display: "inline-block", width: 64, height: 24 }} />}
      sub={<span className="aa-skel-text" style={{ display: "inline-block", width: 120, height: 12 }} />}
      href="/dashboard/sync"
    />
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const [user, totalSolved, upsolveCount, latestAnalysis] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true, name: true },
    }),
    prisma.userSolved.count({ where: { userId: session.user.id } }),
    prisma.upsolvingItem.count({ where: { userId: session.user.id, dismissed: false } }),
    prisma.weakTopicAnalysis.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { topTags: true },
    }),
  ]);

  const weakestTag = latestAnalysis?.topTags?.[0] ?? null;
  const hasLc = Boolean(user?.leetcodeUsername);
  const firstName = user?.name ? user.name.split(" ")[0] : null;
  const currentYear = new Date().getUTCFullYear();

  return (
    <>
      <header className="aa-page-head">
        <h1>{firstName ? `Welcome back, ${firstName}` : "Overview"}</h1>
        <p className="sub">Your DSA progress at a glance.</p>
      </header>

      <div className="aa-stat-grid">
        <StatCard
          label="Total Solved"
          value={totalSolved > 0 ? String(totalSolved) : "—"}
          sub={totalSolved > 0 ? "problems synced" : "Sync your LeetCode"}
          href="/dashboard/sync"
        />
        {hasLc ? (
          <Suspense fallback={<RatingStatSkeleton />}>
            <RatingStatCard username={user!.leetcodeUsername!} />
          </Suspense>
        ) : (
          <StatCard label="Contest Rating" value="—" sub="Connect LeetCode" href="/dashboard/sync" />
        )}
        <StatCard
          label="Upsolve Queue"
          value={String(upsolveCount)}
          sub={upsolveCount > 0 ? "problems to review" : "Refresh to populate"}
          href="/dashboard/upsolving"
        />
        <StatCard
          label="Weakest Tag"
          value={weakestTag ?? "—"}
          sub={weakestTag ? "from latest analysis" : "Run AI analysis"}
          href="/dashboard/analysis"
          mono
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginTop: 12 }}>
        {hasLc ? (
          <Suspense fallback={<RatingPanelSkeleton />}>
            <RatingPanel username={user!.leetcodeUsername!} />
          </Suspense>
        ) : (
          <div className="aa-panel">
            <div className="aa-panel-head">
              <div>
                <div className="title">Contest rating</div>
                <div className="lead">—</div>
              </div>
            </div>
            <div style={{ height: 192, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rc-mute)", fontSize: 13 }}>
              Connect LeetCode to see your rating history.
            </div>
          </div>
        )}
        {hasLc ? (
          <Suspense fallback={<HeatmapPanelSkeleton year={currentYear} />}>
            <HeatmapPanel username={user!.leetcodeUsername!} year={currentYear} />
          </Suspense>
        ) : (
          <div className="aa-panel">
            <div className="aa-panel-head">
              <div>
                <div className="title">Activity · {currentYear}</div>
                <div className="lead">—</div>
              </div>
            </div>
            <div style={{ height: 192, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rc-mute)", fontSize: 13 }}>
              Connect LeetCode to see your activity.
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 28, marginBottom: 14 }} className="aa-eyebrow-label">
        Quick actions
      </div>
      <div className="aa-action-grid">
        {[
          {
            href: "/dashboard/sync",
            title: "Sync LeetCode",
            desc: user?.leetcodeUsername
              ? `Pull latest submissions for @${user.leetcodeUsername}`
              : "Connect your account and pull solved problems.",
            icon: Icon.refresh,
          },
          {
            href: "/dashboard/contest",
            title: "Start a contest",
            desc: "Build a custom timed session around your weak spots.",
            icon: Icon.clock,
          },
          {
            href: "/dashboard/analysis",
            title: "AI report",
            desc: "Get a personalized blind spot analysis from your data.",
            icon: Icon.spark,
          },
        ].map((a) => (
          <Link key={a.title} href={a.href} className="aa-action">
            <div className="aa-feature-icon" style={{ width: 30, height: 30, borderRadius: 7 }}>{a.icon()}</div>
            <h3>{a.title}</h3>
            <p>{a.desc}</p>
            <span className="arrow">{Icon.arrow()}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
