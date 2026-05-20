"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Stage =
  | "idle"
  | "enter-username"
  | "pending-token"
  | "syncing"
  | "done"
  | "error";

interface Props {
  currentUsername: string | null;
  syncedCount: number;
  lastSyncedAt: Date | null;
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SyncPanel({ currentUsername, syncedCount, lastSyncedAt }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [syncResult, setSyncResult] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [backfillCookie, setBackfillCookie] = useState("");
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [showBackfillHelp, setShowBackfillHelp] = useState(false);

  async function handleBackfill() {
    if (!backfillCookie.trim()) return;
    setBackfillLoading(true);
    setBackfillMsg(null);
    try {
      const res = await fetch("/api/leetcode/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leetcodeSession: backfillCookie.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBackfillMsg({ kind: "error", text: data.error ?? "Backfill failed." });
      } else {
        setBackfillMsg({
          kind: "ok",
          text: `Backfilled ${data.added} new problem${data.added !== 1 ? "s" : ""} (${data.totalSlugs} found on LeetCode).`,
        });
        setBackfillCookie("");
        router.refresh();
      }
    } catch {
      setBackfillMsg({ kind: "error", text: "Network error. Try again." });
    } finally {
      setBackfillLoading(false);
    }
  }

  const hasUsername = !!currentUsername;

  async function handleGenerate() {
    if (!username.trim()) return;
    setLoading(true);
    setErrorMsg("");

    const res = await fetch("/api/user/verify-leetcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", username: username.trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(data.error ?? "Something went wrong.");
      return;
    }
    setToken(data.token);
    setStage("pending-token");
  }

  async function handleVerify() {
    setLoading(true);
    setErrorMsg("");

    const res = await fetch("/api/user/verify-leetcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", username: username.trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.verified) {
      setErrorMsg(data.error ?? "Verification failed. Try again.");
      return;
    }
    router.refresh();
  }

  async function handleSync() {
    setStage("syncing");
    setSyncResult(null);
    setErrorMsg("");

    const res = await fetch("/api/leetcode/sync", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setErrorMsg(data.error ?? "Sync failed.");
      setStage("error");
      return;
    }
    setSyncResult(data.synced);
    setStage("done");
    router.refresh();
  }

  function handleCopy() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startChangeUsername() {
    setUsername("");
    setToken("");
    setErrorMsg("");
    setStage("enter-username");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ── Verified / existing username view ────────────────────────────────────
  if (hasUsername && stage === "idle") {
    return (
      <div className="space-y-4">
        {/* Username badge */}
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
          <p className="text-xs text-[#737373] mb-3 font-medium uppercase tracking-wider">LeetCode Account</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">@{currentUsername}</p>
                <p className="text-xs text-green-400">Verified</p>
              </div>
            </div>
            <button
              onClick={startChangeUsername}
              className="text-xs text-[#737373] hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-[#2f2f2f] hover:border-[#3f3f3f]"
            >
              Change
            </button>
          </div>
        </div>

        {/* Sync card */}
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
          <p className="text-xs text-[#737373] mb-1 font-medium uppercase tracking-wider">Sync Submissions</p>
          <p className="text-xs text-[#4a4a4a] mb-4">
            {syncedCount > 0
              ? `${syncedCount} problems in DB${lastSyncedAt ? ` · Last synced ${timeAgo(lastSyncedAt)}` : ""}`
              : "No submissions synced yet"}
          </p>
          <button
            onClick={handleSync}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Sync Now
          </button>
        </div>

        {/* Backfill card */}
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
          <p className="text-xs text-[#737373] mb-1 font-medium uppercase tracking-wider">Full History Backfill</p>
          <p className="text-xs text-[#4a4a4a] mb-3">
            One-time import of your entire solved history. The cookie is used once and never stored.
          </p>

          <button
            type="button"
            onClick={() => setShowBackfillHelp((v) => !v)}
            className="text-xs text-indigo-400 hover:text-indigo-300 mb-3"
          >
            {showBackfillHelp ? "Hide instructions" : "How do I get my LEETCODE_SESSION cookie?"}
          </button>
          {showBackfillHelp && (
            <ol className="text-xs text-[#737373] space-y-1 mb-4 list-decimal pl-4">
              <li>Open <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">leetcode.com</a> and make sure you&apos;re signed in.</li>
              <li>Open DevTools (F12) → <code className="text-[#a3a3a3]">Application</code> → <code className="text-[#a3a3a3]">Cookies</code> → <code className="text-[#a3a3a3]">https://leetcode.com</code>.</li>
              <li>Find <code className="text-[#a3a3a3]">LEETCODE_SESSION</code> and copy its value (long random string).</li>
              <li>Paste it below and click Backfill.</li>
            </ol>
          )}

          <textarea
            value={backfillCookie}
            onChange={(e) => setBackfillCookie(e.target.value)}
            placeholder="Paste LEETCODE_SESSION cookie value here"
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-[#0d0d0d] border border-[#2f2f2f] text-white text-xs font-mono placeholder:text-[#4a4a4a] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />

          {backfillMsg && (
            <div
              className={`mt-3 rounded-xl border px-4 py-2.5 ${
                backfillMsg.kind === "ok"
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-red-500/20 bg-red-500/5"
              }`}
            >
              <p className={`text-xs ${backfillMsg.kind === "ok" ? "text-green-400" : "text-red-400"}`}>
                {backfillMsg.text}
              </p>
            </div>
          )}

          <button
            onClick={handleBackfill}
            disabled={!backfillCookie.trim() || backfillLoading}
            className="w-full mt-3 py-2.5 rounded-xl border border-[#2f2f2f] hover:border-indigo-500 text-sm text-[#a3a3a3] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {backfillLoading && <span className="w-3.5 h-3.5 border border-[#737373] border-t-white rounded-full animate-spin" />}
            {backfillLoading ? "Backfilling…" : "Backfill"}
          </button>
        </div>
      </div>
    );
  }

  // ── Syncing ───────────────────────────────────────────────────────────────
  if (stage === "syncing") {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-8 flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#737373]">Syncing your submissions…</p>
        <p className="text-xs text-[#4a4a4a] text-center max-w-xs">
          Fetching from LeetCode and storing in your database. This may take a moment.
        </p>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{syncResult} problems synced</p>
            <p className="text-xs text-[#737373]">Your database is up to date.</p>
          </div>
        </div>
        <button
          onClick={() => setStage("idle")}
          className="w-full py-2.5 rounded-xl border border-[#2f2f2f] text-[#a3a3a3] hover:text-white text-sm transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-sm font-semibold text-red-400 mb-1">Sync failed</p>
          <p className="text-xs text-[#737373]">{errorMsg}</p>
        </div>
        <button
          onClick={() => setStage("idle")}
          className="w-full py-2.5 rounded-xl border border-[#2f2f2f] text-[#a3a3a3] hover:text-white text-sm transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  // ── Connect / enter username ──────────────────────────────────────────────
  if (stage === "idle" && !hasUsername) {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Connect your LeetCode account</p>
          <p className="text-xs text-[#737373] max-w-xs">
            Link your handle to start syncing solved problems, contest history, and analytics.
          </p>
        </div>
        <button
          onClick={() => setStage("enter-username")}
          className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          Connect Account
        </button>
      </div>
    );
  }

  if (stage === "enter-username") {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white mb-1">Enter your LeetCode username</p>
          <p className="text-xs text-[#737373]">We&apos;ll verify ownership before linking your account.</p>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder="e.g. neal_wu"
          className="w-full px-4 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#2f2f2f] text-white text-sm placeholder:text-[#4a4a4a] focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
        <div className="flex gap-2">
          {hasUsername && (
            <button
              onClick={() => setStage("idle")}
              className="flex-1 py-2.5 rounded-xl border border-[#2f2f2f] text-[#737373] hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={!username.trim() || loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {loading ? "Checking…" : "Generate Token"}
          </button>
        </div>
      </div>
    );
  }

  // ── Pending token / verify ────────────────────────────────────────────────
  if (stage === "pending-token") {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 space-y-5">
        <div>
          <p className="text-sm font-semibold text-white mb-1">Paste this token in your LeetCode profile</p>
          <p className="text-xs text-[#737373] leading-relaxed">
            Go to{" "}
            <a
              href={`https://leetcode.com/${username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              leetcode.com/{username}
            </a>{" "}
            → Edit Profile → About Me → paste the token below → Save.
          </p>
        </div>

        {/* Token box */}
        <div className="rounded-xl border border-[#2f2f2f] bg-[#0d0d0d] p-4 flex items-center justify-between gap-3">
          <code className="text-sm font-mono text-indigo-300 select-all break-all">{token}</code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[#2f2f2f] hover:border-indigo-500 text-xs text-[#737373] hover:text-white transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { setStage("enter-username"); setErrorMsg(""); }}
            className="flex-1 py-2.5 rounded-xl border border-[#2f2f2f] text-[#737373] hover:text-white text-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                Verifying…
              </>
            ) : (
              "I've added it — Verify"
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
