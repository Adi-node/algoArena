"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BadgeKind = "AK" | "COMPLETED" | "TERMINATED";

export interface PastContest {
  id: string;
  topics: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  durationMinutes: number;
  status: "COMPLETED" | "ABANDONED";
  when: string;
  solved: number;
  total: number;
}

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PastContestsButton({ contests }: { contests: PastContest[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2f2f2f] hover:border-indigo-500 text-xs text-[#a3a3a3] hover:text-white transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3v5h5" />
          <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
          <path d="M12 7v5l4 2" />
        </svg>
        Past Contests
        {contests.length > 0 && <span className="text-[#737373]">({contests.length})</span>}
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Past Contests"
          className={`relative w-full max-w-2xl mt-[6vh] sm:mt-[8vh] max-h-[80vh] rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] shadow-2xl flex flex-col transition-all duration-200 ${
            open ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-2"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">Past Contests</h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Your finished custom contests and how you did.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex-shrink-0 p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-3">
            {contests.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.6">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p className="text-sm text-[#a3a3a3]">No past contests found.</p>
              </div>
            ) : (
              contests.map((c) => {
                const isAK = c.status === "COMPLETED" && c.total > 0 && c.solved === c.total;
                const kind: BadgeKind =
                  c.status === "ABANDONED" ? "TERMINATED" : isAK ? "AK" : "COMPLETED";
                const difficultyLabel = c.difficulty
                  ? c.difficulty.charAt(0) + c.difficulty.slice(1).toLowerCase()
                  : "Mixed";
                const topicsLabel = c.topics.length > 0 ? c.topics.join(", ") : "Any topic";
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/contest/${c.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-[#1f1f1f] bg-[#111111] hover:border-[#2f2f2f] p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyle(kind)}`}
                          >
                            {badgeLabel(kind)}
                          </span>
                          <span className="text-xs text-[#737373]">{formatDate(c.when)}</span>
                        </div>
                        <p className="text-sm text-white truncate">
                          {c.solved}/{c.total} solved
                          <span className="text-[#4a4a4a]"> · </span>
                          <span className="text-[#a3a3a3]">{c.durationMinutes}m</span>
                          <span className="text-[#4a4a4a]"> · </span>
                          <span className="text-[#a3a3a3]">{difficultyLabel}</span>
                        </p>
                        <p className="text-xs text-[#737373] mt-1 truncate">{topicsLabel}</p>
                      </div>
                      <span className="text-xs text-[#4a4a4a] flex-shrink-0 mt-1 hidden sm:inline">
                        Review →
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
