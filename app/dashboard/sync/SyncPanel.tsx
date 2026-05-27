"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../_ui/icons";

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
      <div className="aa-section">
        <div className="aa-card">
          <div className="aa-card-eyebrow">LeetCode account</div>
          <div className="aa-card-row">
            <div className="aa-avatar">{Icon.user()}</div>
            <div className="aa-user" style={{ flex: 1 }}>
              <div className="name">@{currentUsername}</div>
              <div className="verified">{Icon.check()} Verified</div>
            </div>
            <button className="aa-btn aa-btn-tertiary aa-btn-sm" onClick={startChangeUsername}>
              Change
            </button>
          </div>
        </div>

        <div className="aa-card">
          <div className="aa-card-eyebrow">Sync submissions</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <p style={{ margin: 0, color: "var(--rc-on-dark-mute)", fontSize: 14 }}>
              {syncedCount > 0 ? (
                <>
                  <span style={{ color: "var(--rc-ink)", fontWeight: 500 }}>{syncedCount}</span> problems in DB
                  {lastSyncedAt && (
                    <>
                      <span style={{ color: "var(--rc-ash)", margin: "0 8px" }}>·</span>
                      Last synced {timeAgo(lastSyncedAt)}
                    </>
                  )}
                </>
              ) : (
                "No submissions synced yet"
              )}
            </p>
          </div>
          <button
            className="aa-btn aa-btn-primary"
            style={{ width: "100%", height: 42 }}
            onClick={handleSync}
          >
            {Icon.refresh()} Sync now
          </button>
        </div>

        <div className="aa-card">
          <div className="aa-card-eyebrow">Full history backfill</div>
          <p style={{ margin: "0 0 8px", color: "var(--rc-on-dark-mute)", fontSize: 14, lineHeight: 1.55 }}>
            One-time import of your entire solved history. The cookie is used once and never stored.
          </p>
          <button
            type="button"
            onClick={() => setShowBackfillHelp((v) => !v)}
            className="aa-link"
            style={{ display: "inline-block", marginBottom: 14 }}
          >
            {showBackfillHelp ? "Hide instructions" : "How do I get my LEETCODE_SESSION cookie?"}
          </button>
          {showBackfillHelp && (
            <ol style={{ fontSize: 12, color: "var(--rc-on-dark-mute)", margin: "0 0 14px", paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Open <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--rc-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>leetcode.com</a> and make sure you&apos;re signed in.</li>
              <li>Open DevTools (F12) → <code>Application</code> → <code>Cookies</code> → <code>https://leetcode.com</code>.</li>
              <li>Find <code>LEETCODE_SESSION</code> and copy its value.</li>
              <li>Paste it below and click Backfill.</li>
            </ol>
          )}
          <textarea
            value={backfillCookie}
            onChange={(e) => setBackfillCookie(e.target.value)}
            placeholder="Paste LEETCODE_SESSION cookie value here"
            className="aa-textarea"
          />
          {backfillMsg && (
            <div className={`aa-banner ${backfillMsg.kind === "ok" ? "ok" : "err"}`} style={{ marginTop: 12 }}>
              {backfillMsg.text}
            </div>
          )}
          <button
            onClick={handleBackfill}
            disabled={!backfillCookie.trim() || backfillLoading}
            className="aa-btn aa-btn-tertiary"
            style={{ width: "100%", height: 42, marginTop: 14 }}
          >
            {backfillLoading ? (<><span className="aa-spin" /> Backfilling…</>) : "Backfill"}
          </button>
        </div>
      </div>
    );
  }

  // ── Syncing ───────────────────────────────────────────────────────────────
  if (stage === "syncing") {
    return (
      <div className="aa-section">
        <div className="aa-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 36 }}>
          <span className="aa-spin" style={{ width: 22, height: 22, borderWidth: 2, color: "var(--rc-ink)" }} />
          <p style={{ margin: 0, color: "var(--rc-body)", fontSize: 14 }}>Syncing your submissions…</p>
          <p style={{ margin: 0, color: "var(--rc-mute)", fontSize: 12, textAlign: "center", maxWidth: 320 }}>
            Fetching from LeetCode and storing in your database. This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <div className="aa-section">
        <div className="aa-banner ok" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {Icon.check()}
          <div>
            <div style={{ color: "var(--rc-ink)", fontWeight: 500, fontSize: 14 }}>{syncResult} problems synced</div>
            <div style={{ color: "var(--rc-on-dark-mute)", fontSize: 12 }}>Your database is up to date.</div>
          </div>
        </div>
        <button className="aa-btn aa-btn-tertiary" style={{ width: "100%" }} onClick={() => setStage("idle")}>
          Back
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <div className="aa-section">
        <div className="aa-banner err">
          <div style={{ color: "var(--rc-ink)", fontWeight: 500, marginBottom: 2 }}>Sync failed</div>
          <div style={{ color: "var(--rc-on-dark-mute)" }}>{errorMsg}</div>
        </div>
        <button className="aa-btn aa-btn-tertiary" style={{ width: "100%" }} onClick={() => setStage("idle")}>
          Back
        </button>
      </div>
    );
  }

  // ── Connect / enter username ──────────────────────────────────────────────
  if (stage === "idle" && !hasUsername) {
    return (
      <div className="aa-section">
        <div className="aa-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 36, textAlign: "center" }}>
          <div className="aa-feature-icon" style={{ width: 44, height: 44, borderRadius: 10 }}>{Icon.user()}</div>
          <div>
            <p style={{ margin: "0 0 4px", color: "var(--rc-ink)", fontWeight: 500, fontSize: 14 }}>
              Connect your LeetCode account
            </p>
            <p style={{ margin: 0, color: "var(--rc-on-dark-mute)", fontSize: 13, maxWidth: 320 }}>
              Link your handle to start syncing solved problems, contest history, and analytics.
            </p>
          </div>
          <button className="aa-btn aa-btn-primary" onClick={() => setStage("enter-username")}>
            Connect account
          </button>
        </div>
      </div>
    );
  }

  if (stage === "enter-username") {
    return (
      <div className="aa-section">
        <div className="aa-card">
          <div className="aa-card-eyebrow">Enter your LeetCode username</div>
          <p style={{ margin: "0 0 14px", color: "var(--rc-on-dark-mute)", fontSize: 13 }}>
            We&apos;ll verify ownership before linking your account.
          </p>
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="e.g. neal_wu"
            className="aa-input"
          />
          {errorMsg && <p style={{ marginTop: 10, color: "var(--rc-red)", fontSize: 12 }}>{errorMsg}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {hasUsername && (
              <button className="aa-btn aa-btn-tertiary" style={{ flex: 1 }} onClick={() => setStage("idle")}>
                Cancel
              </button>
            )}
            <button
              className="aa-btn aa-btn-primary"
              style={{ flex: 1 }}
              onClick={handleGenerate}
              disabled={!username.trim() || loading}
            >
              {loading ? (<><span className="aa-spin" /> Checking…</>) : "Generate token"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending token / verify ────────────────────────────────────────────────
  if (stage === "pending-token") {
    return (
      <div className="aa-section">
        <div className="aa-card">
          <div className="aa-card-eyebrow">Paste this token in your LeetCode profile</div>
          <p style={{ margin: "0 0 16px", color: "var(--rc-on-dark-mute)", fontSize: 13, lineHeight: 1.55 }}>
            Go to{" "}
            <a
              href={`https://leetcode.com/${username}/`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--rc-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              leetcode.com/{username}
            </a>{" "}
            → Edit Profile → About Me → paste the token below → Save.
          </p>

          <div
            style={{
              border: "1px solid var(--rc-hairline)",
              background: "var(--rc-surface-elevated)",
              borderRadius: 8,
              padding: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <code
              style={{
                fontFamily: "var(--rc-font-mono)",
                fontSize: 13,
                color: "var(--rc-ink)",
                wordBreak: "break-all",
              }}
            >
              {token}
            </code>
            <button className="aa-btn aa-btn-tertiary aa-btn-sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {errorMsg && <div className="aa-banner err" style={{ marginTop: 14 }}>{errorMsg}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              className="aa-btn aa-btn-tertiary"
              style={{ flex: 1 }}
              onClick={() => { setStage("enter-username"); setErrorMsg(""); }}
            >
              Back
            </button>
            <button
              className="aa-btn aa-btn-primary"
              style={{ flex: 1 }}
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? (<><span className="aa-spin" /> Verifying…</>) : "I've added it — Verify"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
