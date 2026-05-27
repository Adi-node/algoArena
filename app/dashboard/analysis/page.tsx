import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AnalysisClient from "./AnalysisClient";

export default async function AnalysisPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const [user, history] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true },
    }),
    prisma.weakTopicAnalysis.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, topTags: true, summary: true },
    }),
  ]);

  if (!user?.leetcodeUsername) {
    return (
      <>
        <header className="aa-page-head">
          <h1>AI analysis</h1>
          <p className="sub">
            Personalized blind-spot and struggle-area report from your LeetCode data.
          </p>
        </header>
        <div className="aa-section">
          <div className="aa-banner warn">
            <div style={{ color: "var(--rc-ink)", fontWeight: 500, marginBottom: 4 }}>LeetCode account required</div>
            <div style={{ color: "var(--rc-on-dark-mute)", marginBottom: 12 }}>
              Connect and sync your LeetCode account so we have data to analyze.
            </div>
            <Link href="/dashboard/sync" className="aa-btn aa-btn-primary aa-btn-sm">
              Go to LeetCode Sync
            </Link>
          </div>
        </div>
      </>
    );
  }

  const serialized = history.map((h) => ({
    id: h.id,
    createdAt: h.createdAt.toISOString(),
    topTags: h.topTags,
    summary: h.summary,
  }));

  return (
    <>
      <header className="aa-page-head">
        <h1>AI analysis</h1>
        <p className="sub">Personalized weakness report from your LeetCode data.</p>
      </header>
      <AnalysisClient initialHistory={serialized} />
    </>
  );
}
