"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../../../_ui/icons";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type ContestStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";

interface ContestQuestion {
  id: string;
  questionId: string;
  solved: boolean;
  question: {
    slug: string;
    title: string;
    difficulty: Difficulty;
  };
}

interface Props {
  contestId: string;
  startedAt: string;
  durationMinutes: number;
  status: ContestStatus;
  initialQuestions: ContestQuestion[];
  leetcodeUsername: string | null;
}

const diffLetter: Record<Difficulty, "E" | "M" | "H"> = {
  EASY: "E",
  MEDIUM: "M",
  HARD: "H",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ContestRoom({
  contestId,
  startedAt,
  durationMinutes,
  status: initialStatus,
  initialQuestions,
  leetcodeUsername,
}: Props) {
  const [questions, setQuestions] = useState<ContestQuestion[]>(initialQuestions);
  const [currentStatus, setCurrentStatus] = useState<ContestStatus>(initialStatus);
  const [timeLeft, setTimeLeft] = useState(() => {
    const endAt = new Date(startedAt).getTime() + durationMinutes * 60_000;
    return Math.max(0, Math.floor((endAt - Date.now()) / 1000));
  });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [ending, setEnding] = useState(false);

  const syncAbortRef = useRef<AbortController | null>(null);
  const endAbortRef = useRef<AbortController | null>(null);
  const endingRef = useRef(false);

  useEffect(() => () => {
    syncAbortRef.current?.abort();
    endAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (currentStatus !== "ACTIVE") return;
    const tick = () => {
      const endAt = new Date(startedAt).getTime() + durationMinutes * 60_000;
      setTimeLeft(Math.max(0, Math.floor((endAt - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startedAt, durationMinutes, currentStatus]);

  async function handleSync() {
    if (syncAbortRef.current) return;
    const ac = new AbortController();
    syncAbortRef.current = ac;
    setSyncing(true);
    setSyncError("");
    try {
      const res = await fetch(`/api/contest/${contestId}/sync`, {
        method: "POST",
        signal: ac.signal,
      });
      const data = await res.json();
      if (ac.signal.aborted) return;
      if (!res.ok) {
        setSyncError(data.error ?? "Sync failed.");
        return;
      }
      setQuestions(data.questions);
      setCurrentStatus(data.status);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setSyncError("Network error. Try again.");
    } finally {
      if (syncAbortRef.current === ac) syncAbortRef.current = null;
      setSyncing(false);
    }
  }

  const postEnd = useCallback(async (ac: AbortController) => {
    const res = await fetch(`/api/contest/${contestId}/end`, {
      method: "POST",
      signal: ac.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (ac.signal.aborted) return null;
    if (!res.ok && !data?.alreadyEnded) {
      throw new Error(data?.error ?? `HTTP ${res.status}`);
    }
    return data?.status as "COMPLETED" | "ABANDONED" | undefined;
  }, [contestId]);

  async function handleEnd() {
    if (endingRef.current) return;
    if (!confirm("Terminate this contest? Progress so far will be saved.")) return;
    endingRef.current = true;
    const ac = new AbortController();
    endAbortRef.current = ac;
    setEnding(true);
    setSyncError("");
    try {
      const status = await postEnd(ac);
      if (status) setCurrentStatus(status);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setSyncError("Couldn't terminate contest. Try again.");
    } finally {
      endingRef.current = false;
      if (endAbortRef.current === ac) endAbortRef.current = null;
      setEnding(false);
    }
  }

  useEffect(() => {
    if (currentStatus !== "ACTIVE" || timeLeft > 0) return;
    if (endingRef.current) return;
    endingRef.current = true;
    const ac = new AbortController();
    endAbortRef.current = ac;
    (async () => {
      try {
        const status = await postEnd(ac);
        if (status) setCurrentStatus(status);
      } catch {
        // auto-end failure is non-fatal: leave room ACTIVE, user can hit Terminate
      } finally {
        endingRef.current = false;
        if (endAbortRef.current === ac) endAbortRef.current = null;
      }
    })();
    return () => { ac.abort(); };
  }, [timeLeft, currentStatus, postEnd]);

  const solvedCount = questions.filter((q) => q.solved).length;
  const isActive = currentStatus === "ACTIVE";
  const isExpired = timeLeft === 0 && isActive;

  // ── Completed ───────────────────────────────────────────────────────────
  if (currentStatus === "COMPLETED") {
    const isAK = solvedCount === questions.length;
    return (
      <div className="aa-section">
        <header className="aa-page-head" style={{ marginBottom: 8 }}>
          <h1>Contest result</h1>
        </header>
        <div className={"aa-banner " + (isAK ? "warn" : "info")} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className={"aa-feature-icon " + (isAK ? "yellow" : "")} style={{ width: 38, height: 38 }}>
            {isAK ? Icon.star() : Icon.check()}
          </div>
          <div>
            <div style={{ color: "var(--rc-ink)", fontWeight: 500, fontSize: 14 }}>
              {isAK ? "AK — All solved!" : "Contest completed"}
            </div>
            <div style={{ color: "var(--rc-on-dark-mute)", fontSize: 13 }}>
              {isAK
                ? `You solved all ${questions.length} problem${questions.length !== 1 ? "s" : ""}. Perfect run.`
                : `Time's up — you solved ${solvedCount} of ${questions.length}.`}
            </div>
          </div>
        </div>
        <QuestionList questions={questions} />
        <Link href="/dashboard/contest" className="aa-btn aa-btn-tertiary" style={{ width: "100%" }}>
          New contest
        </Link>
      </div>
    );
  }

  // ── Terminated ──────────────────────────────────────────────────────────
  if (currentStatus === "ABANDONED") {
    return (
      <div className="aa-section">
        <header className="aa-page-head" style={{ marginBottom: 8 }}>
          <h1>Contest terminated</h1>
        </header>
        <div className="aa-banner err" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="aa-feature-icon red" style={{ width: 38, height: 38 }}>{Icon.stop()}</div>
          <div>
            <div style={{ color: "var(--rc-ink)", fontWeight: 500, fontSize: 14 }}>Contest terminated</div>
            <div style={{ color: "var(--rc-on-dark-mute)", fontSize: 13 }}>
              {solvedCount} of {questions.length} solved before stop.
            </div>
          </div>
        </div>
        <QuestionList questions={questions} />
        <Link href="/dashboard/contest" className="aa-btn aa-btn-tertiary" style={{ width: "100%" }}>
          New contest
        </Link>
      </div>
    );
  }

  // ── Active ──────────────────────────────────────────────────────────────
  return (
    <div className="aa-section">
      <header className="aa-page-head" style={{ marginBottom: 8 }}>
        <h1>Contest in progress</h1>
        <p className="sub">Sync your progress to LeetCode periodically.</p>
      </header>

      <div className="aa-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div>
          <div className="aa-card-eyebrow" style={{ marginBottom: 6 }}>
            {isExpired ? "Time's up" : "Time remaining"}
          </div>
          <div
            style={{
              fontFamily: "var(--rc-font-mono)",
              fontSize: 36,
              fontWeight: 600,
              color: isExpired ? "var(--rc-red)" : "var(--rc-ink)",
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
            }}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="aa-card-eyebrow" style={{ marginBottom: 6 }}>Progress</div>
          <div style={{ fontSize: 36, fontWeight: 600, color: "var(--rc-ink)", lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
            {solvedCount}
            <span style={{ fontSize: 20, color: "var(--rc-stone)" }}>/{questions.length}</span>
          </div>
        </div>
      </div>

      <QuestionList questions={questions} />

      {syncError && <div className="aa-banner err">{syncError}</div>}

      {!leetcodeUsername && (
        <p style={{ color: "var(--rc-yellow)", fontSize: 12, textAlign: "center", margin: 0 }}>
          No LeetCode account linked — sync won&apos;t work.{" "}
          <Link href="/dashboard/sync" style={{ textDecoration: "underline" }}>Connect it here.</Link>
        </p>
      )}

      <p style={{ color: "var(--rc-mute)", fontSize: 12, textAlign: "center", margin: 0 }}>
        Sync checks your 50 most recent AC submissions on LeetCode.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleEnd}
          disabled={ending}
          className="aa-btn aa-btn-tertiary"
          style={{ flex: 1, height: 42 }}
        >
          {ending ? "Stopping…" : "Terminate"}
        </button>
        <button
          onClick={handleSync}
          disabled={syncing || isExpired || !leetcodeUsername}
          className="aa-btn aa-btn-primary"
          style={{ flex: 1, height: 42 }}
        >
          {syncing ? (<><span className="aa-spin" /> Syncing…</>) : (<>{Icon.refresh()} Sync progress</>)}
        </button>
      </div>
    </div>
  );
}

function QuestionList({ questions }: { questions: ContestQuestion[] }) {
  return (
    <div className="aa-q-group">
      {questions.map((cq, i) => {
        const letter = diffLetter[cq.question.difficulty];
        return (
          <div key={cq.id} className="aa-q-row">
            <span style={{ color: "var(--rc-stone)", fontSize: 12, width: 20, textAlign: "right", flexShrink: 0, fontFeatureSettings: '"tnum"' }}>
              {i + 1}
            </span>
            <span className={"aa-diff " + letter}>{letter}</span>
            <div className="title">
              <a
                href={`https://leetcode.com/problems/${cq.question.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {cq.question.title}
              </a>
            </div>
            <div style={{ flexShrink: 0 }}>
              {cq.solved ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: "var(--rc-green-soft)",
                    border: "1px solid rgba(89,212,153,0.3)",
                    color: "var(--rc-green)",
                  }}
                >
                  {Icon.check()}
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    border: "1px solid var(--rc-hairline)",
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
