import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CATEGORIES, getCategoryCounts } from "@/lib/practice";
import { Icon } from "../../_ui/icons";

export default async function PracticeHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const counts = await getCategoryCounts();

  return (
    <>
      <div className="aa-page-head">
        <div className="row">
          <div>
            <h1>Practice</h1>
            <p className="sub">Mock-interview coding questions executed in a sandboxed Node.js runtime.</p>
          </div>
          <Link href="/dashboard/practice/history" className="aa-btn aa-btn-tertiary aa-btn-sm">
            View History
          </Link>
        </div>
      </div>

      <div className="aa-action-grid">
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={`/dashboard/practice/${c.key}`} className="aa-action">
            <div className="aa-eyebrow-label">{counts[c.key]} question{counts[c.key] === 1 ? "" : "s"}</div>
            <h3>{c.label}</h3>
            <p>{c.blurb}</p>
            <span className="arrow">{Icon.arrow()}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
