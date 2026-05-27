import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ContestForm from "./ContestForm";
import PastContestsButton from "./PastContestsButton";

const getAvailableTags = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag FROM "Question" ORDER BY tag
    `;
    return rows.map((r) => r.tag);
  },
  ["contest:availableTags"],
  { revalidate: 3600, tags: ["questions"] },
);

export default async function ContestPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const [user, availableTags, pastContests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leetcodeUsername: true },
    }),
    getAvailableTags(),
    prisma.contestSession.findMany({
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
    }),
  ]);

  if (!user?.leetcodeUsername) {
    return (
      <>
        <header className="aa-page-head">
          <h1>Custom contest</h1>
          <p className="sub">Build a timed session around your weak spots.</p>
        </header>
        <div className="aa-section">
          <div className="aa-banner warn">
            <div style={{ color: "var(--rc-ink)", fontWeight: 500, marginBottom: 4 }}>LeetCode account required</div>
            <div style={{ color: "var(--rc-on-dark-mute)", marginBottom: 12 }}>
              Connect and sync your LeetCode account first so we can pick unsolved problems for you.
            </div>
            <Link href="/dashboard/sync" className="aa-btn aa-btn-primary aa-btn-sm">
              Go to LeetCode Sync
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (availableTags.length === 0) {
    return (
      <>
        <header className="aa-page-head">
          <h1>Custom contest</h1>
          <p className="sub">Build a timed session around your weak spots.</p>
        </header>
        <div className="aa-section">
          <div className="aa-card" style={{ textAlign: "center", padding: 36 }}>
            <p style={{ margin: "0 0 6px", color: "var(--rc-ink)", fontWeight: 500, fontSize: 14 }}>
              Question bank is empty
            </p>
            <p style={{ margin: 0, color: "var(--rc-on-dark-mute)", fontSize: 13 }}>
              Run <code>npm run seed:questions</code> once to populate the question bank, then return here.
            </p>
          </div>
        </div>
      </>
    );
  }

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
    <>
      <header className="aa-page-head">
        <div className="row">
          <div>
            <h1>Custom contest</h1>
            <p className="sub">Pick topics, difficulty, and duration — we&apos;ll find unsolved problems for you.</p>
          </div>
          <PastContestsButton contests={serializedPast} />
        </div>
      </header>
      <ContestForm availableTags={availableTags} />
    </>
  );
}
