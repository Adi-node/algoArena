"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

function difficultyColor(d: Difficulty) {
  if (d === "EASY") return "text-green-400";
  if (d === "MEDIUM") return "text-yellow-400";
  return "text-red-400";
}

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

  useEffect(() => {
    if (currentStatus !== "ACTIVE") return;
    const interval = setInterval(() => {
      const endAt = new Date(startedAt).getTime() + durationMinutes * 60_000;
      setTimeLeft(Math.max(0, Math.floor((endAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, currentStatus]);

  async function handleSync() {
    setSyncing(true);
    setSyncError("");
    const res = await fetch(`/api/contest/${contestId}/sync`, { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setSyncError(data.error ?? "Sync failed.");
      return;
    }
    setQuestions(data.questions);
    setCurrentStatus(data.status);
  }

  async function handleEnd() {
    if (!confirm("End this contest? It will be marked as abandoned.")) return;
    setEnding(true);
    const res = await fetch(`/api/contest/${contestId}/end`, { method: "POST" });
    setEnding(false);
    if (res.ok) setCurrentStatus("ABANDONED");
  }

  const solvedCount = questions.filter((q) => q.solved).length;
  const isActive = currentStatus === "ACTIVE";
  const isExpired = timeLeft === 0 && isActive;

  // ── Completed ────────────────────────────────────────────────────────────────
  if (currentStatus === "COMPLETED") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Contest Complete!</p>
            <p className="text-xs text-[#737373]">
              You solved all {questions.length} problem{questions.length !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>
        <QuestionList questions={questions} />
        <Link
          href="/dashboard/contest"
          className="block w-full py-2.5 rounded-xl border border-[#2f2f2f] text-[#a3a3a3] hover:text-white text-sm text-center transition-colors"
        >
          New Contest
        </Link>
      </div>
    );
  }

  // ── Abandoned ─────────────────────────────────────────────────────────────────
  if (currentStatus === "ABANDONED") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#2f2f2f] bg-[#111111] p-6">
          <p className="text-sm font-semibold text-[#737373] mb-1">Contest ended</p>
          <p className="text-xs text-[#4a4a4a]">
            {solvedCount} of {questions.length} solved
          </p>
        </div>
        <QuestionList questions={questions} />
        <Link
          href="/dashboard/contest"
          className="block w-full py-2.5 rounded-xl border border-[#2f2f2f] text-[#a3a3a3] hover:text-white text-sm text-center transition-colors"
        >
          New Contest
        </Link>
      </div>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header: timer + progress */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#737373] mb-1 font-medium uppercase tracking-wider">
            {isExpired ? "Time's up" : "Time remaining"}
          </p>
          <p className={`text-3xl font-mono font-bold ${isExpired ? "text-red-400" : "text-white"}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#737373] mb-1 font-medium uppercase tracking-wider">Progress</p>
          <p className="text-3xl font-bold text-indigo-400">
            {solvedCount}
            <span className="text-lg text-[#4a4a4a]">/{questions.length}</span>
          </p>
        </div>
      </div>

      {/* Question list */}
      <QuestionList questions={questions} />

      {syncError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">{syncError}</p>
        </div>
      )}

      {!leetcodeUsername && (
        <p className="text-xs text-yellow-400 text-center">
          No LeetCode account linked — sync won&apos;t work.{" "}
          <Link href="/dashboard/sync" className="underline">Connect it here.</Link>
        </p>
      )}

      <p className="text-xs text-[#4a4a4a] text-center">
        Sync checks your 50 most recent AC submissions on LeetCode.
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleEnd}
          disabled={ending}
          className="flex-1 py-2.5 rounded-xl border border-[#2f2f2f] text-[#737373] hover:text-white disabled:opacity-40 text-sm transition-colors"
        >
          {ending ? "Ending…" : "End Contest"}
        </button>
        <button
          onClick={handleSync}
          disabled={syncing || isExpired || !leetcodeUsername}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
              Syncing…
            </>
          ) : (
            "Sync Progress"
          )}
        </button>
      </div>
    </div>
  );
}

function QuestionList({ questions }: { questions: ContestQuestion[] }) {
  return (
    <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] divide-y divide-[#1a1a1a]">
      {questions.map((cq, i) => (
        <div key={cq.id} className="flex items-center gap-4 p-4">
          <span className="text-xs text-[#4a4a4a] w-5 text-right flex-shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <a
              href={`https://leetcode.com/problems/${cq.question.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white hover:text-indigo-400 transition-colors truncate block"
            >
              {cq.question.title}
            </a>
            <p className={`text-xs mt-0.5 ${difficultyColor(cq.question.difficulty)}`}>
              {cq.question.difficulty.charAt(0) + cq.question.difficulty.slice(1).toLowerCase()}
            </p>
          </div>
          <div className="flex-shrink-0">
            {cq.solved ? (
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border border-[#2f2f2f]" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
