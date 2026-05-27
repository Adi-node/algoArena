import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Brand, Icon } from "./_ui/icons";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <div className="aa-shell">
      {/* Top nav */}
      <nav className="aa-nav">
        <div className="aa-nav-inner">
          <Link href="/"><Brand /></Link>
          <div style={{ display: "flex", gap: 22, marginLeft: 32 }}>
            <Link href="/" className="aa-nav-link">Features</Link>
            <Link href="/" className="aa-nav-link">Changelog</Link>
            <Link href="/" className="aa-nav-link">Pricing</Link>
          </div>
          <div className="aa-nav-right">
            <Link href="/dashboard" className="aa-nav-link">Dashboard</Link>
            <Link href="/api/auth/signin" className="aa-btn aa-btn-primary aa-btn-sm">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="aa-hero">
        <div className="aa-hero-stripes" aria-hidden="true"><i /></div>
        <div className="aa-hero-fade" aria-hidden="true" />
        <div className="aa-hero-inner">
          <span className="aa-eyebrow"><span className="dot" /> AI-powered DSA training</span>
          <h1>
            Train smarter.<br />
            <span className="accent">Rank faster.</span>
          </h1>
          <p className="aa-hero-sub">
            A strategic layer on top of LeetCode. Analyze your weaknesses, build
            custom contests, and close blind spots with AI-generated insights.
          </p>
          <div className="aa-hero-cta">
            <Link href="/api/auth/signin" className="aa-btn aa-btn-primary">
              Get started
              <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
                <span className="aa-key aa-key-on-light">⌘</span>
                <span className="aa-key aa-key-on-light">↵</span>
              </span>
            </Link>
            <Link href="/dashboard" className="aa-btn aa-btn-tertiary">
              View dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="aa-features">
        <div className="aa-container">
          <div className="aa-feature-grid">
            <article className="aa-feature aa-span-3">
              <div className="aa-feature-icon blue">{Icon.trend()}</div>
              <h3>LeetCode sync</h3>
              <p>
                Fetch your accepted submissions, contest rating, and ranking history from
                LeetCode&apos;s GraphQL API into your personal database.
              </p>
              <div className="vis">
                <span className="aa-tag blue">Auto-sync</span>
              </div>
            </article>

            <article className="aa-feature aa-span-3">
              <div className="aa-feature-icon violet">{Icon.clock()}</div>
              <h3>Custom contest</h3>
              <p>
                Pick topics, difficulty, and count. Algo Arena assembles a timed contest
                from unsolved problems and tracks the run.
              </p>
              <div className="vis">
                <div style={{ display: "flex", gap: 6, width: "100%" }}>
                  {[42, 78, 56, 90, 35].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, height: 56,
                      borderRadius: 4,
                      background: `linear-gradient(180deg, rgba(255,255,255,${(h / 100) * 0.55}), rgba(255,255,255,0.04))`,
                      border: "1px solid var(--rc-hairline)",
                    }} />
                  ))}
                </div>
              </div>
            </article>

            <article className="aa-feature aa-span-3">
              <div className="aa-feature-icon yellow">{Icon.shield()}</div>
              <h3>Upsolving queue</h3>
              <p>Flags missed contest problems and queues them for later review — never lose a learning moment.</p>
            </article>

            <article className="aa-feature aa-span-3">
              <div className="aa-feature-icon green">{Icon.spark()}</div>
              <h3>AI weakness analysis</h3>
              <p>Feeds your tag distribution to an LLM to generate a personal Blind Spot Report — exactly what to study next.</p>
              <div className="vis">
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                  {[["Dynamic programming", 78], ["Graph theory", 64], ["Binary search", 41]].map(([label, pct]) => (
                    <div key={String(label)} className="aa-bar-row">
                      <div className="aa-bar"><span style={{ width: `${pct}%` }} /></div>
                      <div className="aa-bar-lbl">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="aa-footer">
        <div className="aa-container aa-footer-inner">
          <span>© 2026 Algo Arena</span>
          <span>Built for competitive programmers</span>
        </div>
      </footer>
    </div>
  );
}
