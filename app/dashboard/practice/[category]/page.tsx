import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CATEGORIES, getQuestionsByCategory, isCategory } from "@/lib/practice";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const { category } = await params;
  if (!isCategory(category)) notFound();

  const meta = CATEGORIES.find((c) => c.key === category)!;
  const questions = await getQuestionsByCategory(category);

  return (
    <>
      <div className="aa-page-head">
        <div className="row">
          <div>
            <h1>{meta.label}</h1>
            <p className="sub">{meta.blurb}</p>
          </div>
          <Link href="/dashboard/practice" className="aa-btn aa-btn-ghost aa-btn-sm">
            ← All categories
          </Link>
        </div>
      </div>

      <div className="aa-q-group">
        {questions.map((q) => {
          const code = q.difficulty[0] as "E" | "M" | "H";
          return (
            <div key={q.id} className="aa-q-row">
              <span className={`aa-diff ${code}`}>{code}</span>
              <div className="title">
                <Link href={`/dashboard/practice/${category}/${q.id}`}>{q.title}</Link>
              </div>
              <span className="aa-tag">{q.difficulty}</span>
            </div>
          );
        })}
        {questions.length === 0 && (
          <div className="aa-q-row">
            <div className="title" style={{ color: "var(--rc-mute)" }}>No questions yet.</div>
          </div>
        )}
      </div>
    </>
  );
}
