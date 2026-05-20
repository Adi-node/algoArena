"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface UpsolvingItem {
  id: string;
  contestTitle: string;
  contestDate: string;
  question: {
    slug: string;
    title: string;
    difficulty: Difficulty;
  };
}

interface Props {
  items: UpsolvingItem[];
}

const difficultyStyle: Record<Difficulty, string> = {
  EASY: "text-green-400 bg-green-400/10",
  MEDIUM: "text-yellow-400 bg-yellow-400/10",
  HARD: "text-red-400 bg-red-400/10",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByContest(items: UpsolvingItem[]) {
  const map = new Map<string, { contestTitle: string; contestDate: string; items: UpsolvingItem[] }>();
  for (const item of items) {
    const key = item.contestTitle;
    if (!map.has(key)) map.set(key, { contestTitle: item.contestTitle, contestDate: item.contestDate, items: [] });
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.contestDate).getTime() - new Date(a.contestDate).getTime()
  );
}

export default function UpsolvingQueue({ items: initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [contestInput, setContestInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (!confirm("Wipe your entire upsolve queue? You'll need to Refresh again to rebuild it.")) return;
    setResetting(true);
    setToast(null);
    try {
      const res = await fetch("/api/upsolving/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? "Reset failed.");
      } else {
        setItems([]);
        setToast(`Cleared ${data.deleted} item${data.deleted !== 1 ? "s" : ""}.`);
        router.refresh();
      }
    } catch {
      setToast("Network error. Try again.");
    } finally {
      setResetting(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setToast(null);
    try {
      const res = await fetch("/api/upsolving/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? "Refresh failed.");
      } else {
        const msg =
          data.added > 0
            ? `+${data.added} problem${data.added !== 1 ? "s" : ""} added`
            : "Queue is up to date";
        setToast(msg);
        router.refresh();
      }
    } catch {
      setToast("Network error. Try again.");
    } finally {
      setRefreshing(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleAddContest() {
    if (!contestInput.trim()) return;
    const slug = contestInput.trim().toLowerCase().replace(/\s+/g, "-");
    setAdding(true);
    setToast(null);
    try {
      const res = await fetch("/api/upsolving/add-contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? "Failed to add contest.");
      } else {
        setToast(
          data.added > 0
            ? `+${data.added} problem${data.added !== 1 ? "s" : ""} added from ${data.contestTitle}`
            : `No unsolved problems found in ${data.contestTitle}`
        );
        setContestInput("");
        router.refresh();
      }
    } catch {
      setToast("Network error. Try again.");
    } finally {
      setAdding(false);
      setTimeout(() => setToast(null), 5000);
    }
  }

  async function handleMarkDone(itemId: string) {
    setMarkingDone(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await fetch("/api/upsolving/mark-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
    } catch {
      // optimistic — failure is silent; next refresh will restore if needed
    } finally {
      setMarkingDone(null);
    }
  }

  const groups = groupByContest(items);

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#737373]">
          {items.length > 0 ? `${items.length} problem${items.length !== 1 ? "s" : ""} to upsolve` : "Queue empty"}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetting || items.length === 0}
            className="px-3 py-2 rounded-xl border border-[#2f2f2f] hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-[#737373] hover:text-red-400 transition-colors"
          >
            {resetting ? "Resetting…" : "Reset"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {refreshing ? (
              <>
                <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                Refreshing…
              </>
            ) : (
              "Refresh from LeetCode"
            )}
          </button>
        </div>
      </div>

      {/* Manual contest entry */}
      <div className="flex gap-2">
        <input
          type="text"
          value={contestInput}
          onChange={(e) => setContestInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddContest()}
          placeholder="Add a contest manually, e.g. weekly-contest-451"
          className="flex-1 px-4 py-2 rounded-xl bg-[#0d0d0d] border border-[#2f2f2f] text-white text-sm placeholder:text-[#4a4a4a] focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          onClick={handleAddContest}
          disabled={adding || !contestInput.trim()}
          className="px-4 py-2 rounded-xl border border-[#2f2f2f] hover:border-indigo-500 text-sm text-[#a3a3a3] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {adding ? <span className="w-3.5 h-3.5 border border-[#737373] border-t-white rounded-full animate-spin" /> : null}
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
          <p className="text-xs text-indigo-300">{toast}</p>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-10 flex flex-col items-center gap-3 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm font-semibold text-white">You&apos;re all caught up</p>
          <p className="text-xs text-[#737373] max-w-xs">
            No unsolved contest problems found. Click Refresh to pull your latest contest history.
          </p>
        </div>
      )}

      {/* Contest groups */}
      {groups.map((group) => (
        <div key={group.contestTitle} className="rounded-2xl border border-[#1f1f1f] bg-[#111111] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{group.contestTitle}</p>
            <p className="text-xs text-[#4a4a4a]">{formatDate(group.contestDate)}</p>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {group.items.map((item) => (
              <div key={item.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${difficultyStyle[item.question.difficulty]}`}
                  >
                    {item.question.difficulty[0]}
                  </span>
                  <a
                    href={`https://leetcode.com/problems/${item.question.slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#e5e5e5] hover:text-indigo-400 transition-colors truncate"
                  >
                    {item.question.title}
                  </a>
                </div>
                <button
                  onClick={() => handleMarkDone(item.id)}
                  disabled={markingDone === item.id}
                  className="flex-shrink-0 text-xs text-[#737373] hover:text-green-400 border border-[#2f2f2f] hover:border-green-500/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  {markingDone === item.id ? "…" : "Mark Done"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
