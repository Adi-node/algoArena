"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../../_ui/icons";

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

function badgeClass(kind: BadgeKind) {
  if (kind === "AK") return "yellow";
  if (kind === "COMPLETED") return "";
  return "red";
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
        className="aa-btn aa-btn-tertiary aa-btn-sm"
      >
        {Icon.clock()} Past contests
        {contests.length > 0 && <span style={{ color: "var(--rc-mute)", marginLeft: 4 }}>({contests.length})</span>}
      </button>

      {open && (
        <div className="aa-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Past Contests"
            className="aa-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aa-modal-head">
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--rc-ink)" }}>Past contests</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--rc-mute)" }}>
                  Your finished custom contests and how you did.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="aa-btn aa-btn-ghost aa-btn-sm"
                style={{ padding: 6 }}
              >
                {Icon.close()}
              </button>
            </div>

            <div className="aa-modal-body">
              {contests.length === 0 ? (
                <div style={{ padding: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
                  <div className="aa-feature-icon" style={{ width: 32, height: 32 }}>{Icon.clock()}</div>
                  <p style={{ margin: 0, color: "var(--rc-body)", fontSize: 14 }}>No past contests found.</p>
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
                      className="aa-prev-row"
                      style={{ display: "block", padding: "14px 16px" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span className={`aa-tag ${badgeClass(kind)}`}>{badgeLabel(kind)}</span>
                        <span style={{ color: "var(--rc-mute)", fontSize: 12 }}>{formatDate(c.when)}</span>
                      </div>
                      <p style={{ margin: 0, color: "var(--rc-ink)", fontSize: 13 }}>
                        {c.solved}/{c.total} solved
                        <span style={{ color: "var(--rc-stone)", margin: "0 6px" }}>·</span>
                        <span style={{ color: "var(--rc-body)" }}>{c.durationMinutes}m</span>
                        <span style={{ color: "var(--rc-stone)", margin: "0 6px" }}>·</span>
                        <span style={{ color: "var(--rc-body)" }}>{difficultyLabel}</span>
                      </p>
                      <p style={{ margin: "4px 0 0", color: "var(--rc-mute)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {topicsLabel}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
