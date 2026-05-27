"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../_ui/icons";

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

const diffLetter: Record<Difficulty, "E" | "M" | "H"> = {
  EASY: "E",
  MEDIUM: "M",
  HARD: "H",
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

  const refreshAbortRef = useRef<AbortController | null>(null);
  const addAbortRef = useRef<AbortController | null>(null);
  const resetAbortRef = useRef<AbortController | null>(null);
  const markDoneAbortRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => () => {
    refreshAbortRef.current?.abort();
    addAbortRef.current?.abort();
    resetAbortRef.current?.abort();
    markDoneAbortRef.current.forEach((ac) => ac.abort());
  }, []);

  async function handleReset() {
    if (resetAbortRef.current) return;
    if (!confirm("Wipe your entire upsolve queue? You'll need to Refresh again to rebuild it.")) return;
    const ac = new AbortController();
    resetAbortRef.current = ac;
    setResetting(true);
    setToast(null);
    try {
      const res = await fetch("/api/upsolving/reset", { method: "POST", signal: ac.signal });
      const data = await res.json();
      if (ac.signal.aborted) return;
      if (!res.ok) {
        setToast(data.error ?? "Reset failed.");
      } else {
        setItems([]);
        setToast(`Cleared ${data.deleted} item${data.deleted !== 1 ? "s" : ""}.`);
        router.refresh();
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setToast("Network error. Try again.");
    } finally {
      if (resetAbortRef.current === ac) resetAbortRef.current = null;
      setResetting(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleRefresh() {
    if (refreshAbortRef.current) return;
    const ac = new AbortController();
    refreshAbortRef.current = ac;
    setRefreshing(true);
    setToast(null);
    try {
      const res = await fetch("/api/upsolving/refresh", { method: "POST", signal: ac.signal });
      const data = await res.json();
      if (ac.signal.aborted) return;
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
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setToast("Network error. Try again.");
    } finally {
      if (refreshAbortRef.current === ac) refreshAbortRef.current = null;
      setRefreshing(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleAddContest() {
    if (!contestInput.trim()) return;
    if (addAbortRef.current) return;
    const slug = contestInput.trim().toLowerCase().replace(/\s+/g, "-");
    const ac = new AbortController();
    addAbortRef.current = ac;
    setAdding(true);
    setToast(null);
    try {
      const res = await fetch("/api/upsolving/add-contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestSlug: slug }),
        signal: ac.signal,
      });
      const data = await res.json();
      if (ac.signal.aborted) return;
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
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setToast("Network error. Try again.");
    } finally {
      if (addAbortRef.current === ac) addAbortRef.current = null;
      setAdding(false);
      setTimeout(() => setToast(null), 5000);
    }
  }

  async function handleMarkDone(itemId: string) {
    if (markDoneAbortRef.current.has(itemId)) return;
    const ac = new AbortController();
    markDoneAbortRef.current.set(itemId, ac);
    setMarkingDone(itemId);

    let removedItem: UpsolvingItem | undefined;
    let removedIndex = -1;
    setItems((prev) => {
      removedIndex = prev.findIndex((i) => i.id === itemId);
      removedItem = prev[removedIndex];
      return removedIndex === -1 ? prev : prev.filter((i) => i.id !== itemId);
    });

    const restore = () => {
      if (!removedItem || removedIndex < 0) return;
      setItems((prev) => {
        if (prev.some((i) => i.id === itemId)) return prev;
        const copy = prev.slice();
        copy.splice(Math.min(removedIndex, copy.length), 0, removedItem!);
        return copy;
      });
    };

    try {
      const res = await fetch("/api/upsolving/mark-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      if (!res.ok) {
        restore();
        setToast("Couldn't mark done. Try again.");
        setTimeout(() => setToast(null), 4000);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      restore();
      setToast("Network error. Try again.");
      setTimeout(() => setToast(null), 4000);
    } finally {
      markDoneAbortRef.current.delete(itemId);
      setMarkingDone(null);
    }
  }

  const groups = groupByContest(items);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div style={{ color: "var(--rc-mute)", fontSize: 13 }}>
          <span style={{ color: "var(--rc-ink)", fontWeight: 500, fontFeatureSettings: '"tnum"' }}>{items.length}</span>{" "}
          {items.length === 1 ? "problem" : "problems"} to upsolve
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleReset}
            disabled={resetting || items.length === 0}
            className="aa-btn aa-btn-danger aa-btn-sm"
          >
            {resetting ? "Resetting…" : "Reset"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="aa-btn aa-btn-primary aa-btn-sm"
          >
            {refreshing ? (
              <><span className="aa-spin" /> Refreshing…</>
            ) : (
              <>{Icon.refresh()} Refresh from LeetCode</>
            )}
          </button>
        </div>
      </div>

      {/* Manual add */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            border: "1px solid var(--rc-hairline)",
            background: "var(--rc-surface-elevated)",
            borderRadius: 8,
            height: 38,
          }}
        >
          <span style={{ color: "var(--rc-ash)" }}>{Icon.plus()}</span>
          <input
            value={contestInput}
            onChange={(e) => setContestInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddContest()}
            placeholder="Add a contest manually, e.g. weekly-contest-451"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              color: "var(--rc-ink)",
              outline: "none",
              fontFamily: "inherit",
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={handleAddContest}
          disabled={adding || !contestInput.trim()}
          className="aa-btn aa-btn-tertiary aa-btn-sm"
        >
          {adding ? <span className="aa-spin" /> : null}
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {toast && (
        <div className="aa-banner info" style={{ marginBottom: 18 }}>
          {toast}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="aa-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 40, textAlign: "center" }}>
          <div className="aa-feature-icon green" style={{ width: 40, height: 40 }}>{Icon.check()}</div>
          <p style={{ margin: 0, color: "var(--rc-ink)", fontWeight: 500, fontSize: 14 }}>You&apos;re all caught up</p>
          <p style={{ margin: 0, color: "var(--rc-on-dark-mute)", fontSize: 13, maxWidth: 320 }}>
            No unsolved contest problems found. Click Refresh to pull your latest contest history.
          </p>
        </div>
      )}

      {/* Contest groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map((group) => (
          <div key={group.contestTitle} className="aa-q-group">
            <div className="aa-q-head">
              <div className="name">{group.contestTitle}</div>
              <div className="date">{formatDate(group.contestDate)}</div>
            </div>
            {group.items.map((item) => {
              const letter = diffLetter[item.question.difficulty];
              const isMarking = markingDone === item.id;
              return (
                <div key={item.id} className="aa-q-row">
                  <span className={"aa-diff " + letter}>{letter}</span>
                  <div className="title">
                    <a
                      href={`https://leetcode.com/problems/${item.question.slug}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.question.title}
                    </a>
                  </div>
                  <button
                    onClick={() => handleMarkDone(item.id)}
                    disabled={isMarking}
                    className="aa-btn aa-btn-tertiary aa-btn-sm"
                  >
                    {isMarking ? "…" : "Mark done"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
