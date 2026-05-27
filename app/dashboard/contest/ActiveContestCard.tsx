"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "../../_ui/icons";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface Props {
  id: string;
  topics: string[];
  difficulty: Difficulty | null;
  durationMinutes: number;
  startedAtIso: string;
  solvedCount: number;
  totalQuestions: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ActiveContestCard({
  id,
  topics,
  difficulty,
  durationMinutes,
  startedAtIso,
  solvedCount,
  totalQuestions,
}: Props) {
  const router = useRouter();
  const startedAtMs = new Date(startedAtIso).getTime();
  const endAtMs = startedAtMs + durationMinutes * 60_000;

  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.floor((endAtMs - Date.now()) / 1000))
  );
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const tick = () => {
      setTimeLeft(Math.max(0, Math.floor((endAtMs - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endAtMs]);

  const expired = timeLeft === 0;

  async function handleDiscard() {
    if (inFlightRef.current) return;
    if (!confirm("Discard this contest? Progress so far will be saved.")) return;
    inFlightRef.current = true;
    const ac = new AbortController();
    abortRef.current = ac;
    setDiscarding(true);
    setError("");
    try {
      const res = await fetch(`/api/contest/${id}/end`, {
        method: "POST",
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (ac.signal.aborted) return;
      if (!res.ok && !data?.alreadyEnded) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("Couldn't discard the contest. Try again.");
    } finally {
      inFlightRef.current = false;
      if (abortRef.current === ac) abortRef.current = null;
      setDiscarding(false);
    }
  }

  return (
    <div className="aa-section">
      <div className="aa-card">
        <div className="aa-card-eyebrow" style={{ marginBottom: 14 }}>
          Active contest
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 18,
          }}
        >
          <div>
            <div className="aa-card-eyebrow" style={{ marginBottom: 6 }}>
              {expired ? "Time's up — resume to finalize" : "Time remaining"}
            </div>
            <div
              style={{
                fontFamily: "var(--rc-font-mono)",
                fontSize: 36,
                fontWeight: 600,
                color: expired ? "var(--rc-red)" : "var(--rc-ink)",
                fontFeatureSettings: '"tnum"',
                lineHeight: 1,
              }}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="aa-card-eyebrow" style={{ marginBottom: 6 }}>
              Progress
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: "var(--rc-ink)",
                lineHeight: 1,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {solvedCount}
              <span style={{ fontSize: 20, color: "var(--rc-stone)" }}>/{totalQuestions}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
          }}
        >
          {topics.length > 0 ? (
            topics.map((t) => (
              <span key={t} className="aa-chip is-on">
                {t}
              </span>
            ))
          ) : (
            <span className="aa-chip">Any topic</span>
          )}
          <span className="aa-chip">{difficulty ?? "Any difficulty"}</span>
          <span className="aa-chip">{durationMinutes}m</span>
        </div>

        {error && (
          <div className="aa-banner err" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleDiscard}
            disabled={discarding}
            className="aa-btn aa-btn-tertiary"
            style={{ flex: 1, height: 42 }}
          >
            {discarding ? "Discarding…" : "Discard"}
          </button>
          <Link
            href={`/dashboard/contest/${id}`}
            className="aa-btn aa-btn-primary"
            style={{ flex: 1, height: 42, justifyContent: "center" }}
          >
            {Icon.clock()} Resume contest
          </Link>
        </div>
      </div>
    </div>
  );
}
