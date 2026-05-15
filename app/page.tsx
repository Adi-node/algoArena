import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 13L8 3L13 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 9H11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Algo Arena</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-[#737373] hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/api/auth/signin"
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1f1f1f] bg-[#111111] text-xs text-[#737373] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI-powered DSA training
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          Train smarter.{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
            Rank faster.
          </span>
        </h1>
        <p className="text-lg text-[#737373] max-w-xl mx-auto mb-10 leading-relaxed">
          A strategic layer on top of LeetCode. Analyze your weaknesses, build custom contests, and close blind spots with AI-generated insights.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/api/auth/signin"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-[#1f1f1f] hover:border-[#333] text-[#a3a3a3] hover:text-white font-medium text-sm transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[180px]">

          {/* LeetCode Sync — wide */}
          <div className="lg:col-span-2 rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 flex flex-col justify-between group hover:border-[#2f2f2f] transition-colors overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2f2f2f] flex items-center justify-center text-indigo-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">LeetCode Sync</h3>
            </div>
            <div>
              <p className="text-xs text-[#737373] leading-relaxed mb-3">
                Fetch your accepted submissions, contest rating, and ranking history from LeetCode&apos;s GraphQL API into your personal database.
              </p>
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Auto-sync</span>
            </div>
          </div>

          {/* Custom Contest */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 flex flex-col justify-between group hover:border-[#2f2f2f] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2f2f2f] flex items-center justify-center text-purple-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Custom Contest</h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                Pick topics, difficulty, and count. We generate a timed contest with unsolved problems.
              </p>
            </div>
          </div>

          {/* Upsolving Tracker */}
          <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 flex flex-col justify-between group hover:border-[#2f2f2f] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2f2f2f] flex items-center justify-center text-yellow-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Upsolving Queue</h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                Flags missed contest problems and queues them for later review.
              </p>
            </div>
          </div>

          {/* AI Weakness Analysis — tall */}
          <div className="row-span-2 rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 flex flex-col justify-between group hover:border-[#2f2f2f] transition-colors relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-indigo-600/5 to-transparent" />
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2f2f2f] flex items-center justify-center text-green-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">AI Weakness Analysis</h3>
              <p className="text-xs text-[#737373] leading-relaxed mb-4">
                Feeds your solved/unsolved tag distribution to an LLM to generate a personalized Blind Spot Report. Pinpoint exactly what to study next.
              </p>
              <div className="space-y-2">
                {[
                  { label: "Dynamic Programming", pct: 35 },
                  { label: "Graph Theory", pct: 58 },
                  { label: "Binary Search", pct: 72 },
                ].map(({ label, pct }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-[#1f1f1f] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#737373] w-24 truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Complexity Analyzer */}
          <div className="lg:col-span-2 rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 flex flex-col justify-between group hover:border-[#2f2f2f] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2f2f2f] flex items-center justify-center text-orange-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Static Complexity Analyzer</h3>
            </div>
            <div>
              <p className="text-xs text-[#737373] leading-relaxed mb-3">
                Paste your accepted code and get instant Time/Space Complexity (O notation) + AI optimization tips.
              </p>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">O(n log n)</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#1a1a1a] text-[#737373] border border-[#2f2f2f]">Space: O(1)</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] px-6 py-6 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-xs text-[#737373]">© 2026 Algo Arena</span>
        <span className="text-xs text-[#737373]">Built for competitive programmers</span>
      </footer>
    </div>
  );
}
