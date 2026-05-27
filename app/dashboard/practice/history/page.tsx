import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CATEGORIES,
  getQuestionsByCategory,
  type PracticeCategory,
} from "@/lib/practice";

export default async function PracticeHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const titleMap = new Map<string, string>();
  await Promise.all(
    CATEGORIES.map(async (c) => {
      const list = await getQuestionsByCategory(c.key);
      list.forEach((q) => titleMap.set(`${c.key}:${q.id}`, q.title));
    })
  );

  return (
    <>
      <div className="aa-page-head">
        <div className="row">
          <div>
            <h1>Practice History</h1>
            <p className="sub">Your last {attempts.length} attempt{attempts.length === 1 ? "" : "s"} across all categories.</p>
          </div>
          <Link href="/dashboard/practice" className="aa-btn aa-btn-ghost aa-btn-sm">
            ← Practice
          </Link>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="aa-banner info">No attempts yet. Pick a question to get started.</div>
      ) : (
        <div className="aa-q-group">
          {attempts.map((a) => {
            const title = titleMap.get(`${a.category}:${a.questionId}`) ?? a.questionId;
            const passed = a.status === "PASSED";
            return (
              <Link
                key={a.id}
                href={`/dashboard/practice/${a.category as PracticeCategory}/${a.questionId}?attempt=${a.id}`}
                className="aa-q-row"
                style={{ textDecoration: "none" }}
              >
                <span className={`aa-tag ${passed ? "green" : "red"}`}>
                  {passed ? "PASSED" : "FAILED"}
                </span>
                <div className="title">{title}</div>
                <span className="aa-tag">{a.category}</span>
                <span style={{ color: "var(--rc-mute)", fontSize: 12, fontFeatureSettings: '"tnum"' }}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
