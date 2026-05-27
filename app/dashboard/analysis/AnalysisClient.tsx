"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Icon } from "../../_ui/icons";

interface Meta {
  medianSolved: number;
  totalFailuresAnalyzed: number;
  totalSolvedAnalyzed: number;
}

interface ImprovementEntry {
  topic: string;
  previousScore: number;
  currentScore: number;
  delta: number;
}

interface Improvement {
  droppedFromTop5: string[];
  stillInTop5: string[];
  newToTop5: string[];
  improvedByScore: ImprovementEntry[];
  regressedByScore: ImprovementEntry[];
}

interface HistoryItem {
  id: string;
  createdAt: string;
  topTags: string[];
  summary: string;
}

type Status = "idle" | "streaming" | "done" | "error";

interface Props {
  initialHistory: HistoryItem[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

function ImprovementRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ color: "var(--rc-mute)", fontSize: 12, width: 80, flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((t) => (
          <span key={t} className="aa-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function AnalysisClient({ initialHistory }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [, setMeta] = useState<Meta | null>(null);
  const [topTags, setTopTags] = useState<string[]>([]);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const summaryRef = useRef("");
  const runIdRef = useRef(0);
  const STREAM_IDLE_TIMEOUT_MS = 30_000;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function resetForRun() {
    setMeta(null);
    setTopTags([]);
    setImprovement(null);
    setSummary("");
    setError(null);
    summaryRef.current = "";
  }

  function handleFrame(frame: string, myRunId: number) {
    if (myRunId !== runIdRef.current) return;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    const raw = dataLines.join("\n");
    if (!raw) return;

    try {
      switch (event) {
        case "meta":
          setMeta(JSON.parse(raw));
          break;
        case "topTags":
          setTopTags(JSON.parse(raw));
          break;
        case "improvement":
          setImprovement(JSON.parse(raw));
          break;
        case "token": {
          const delta = JSON.parse(raw).delta as string | undefined;
          if (delta) {
            summaryRef.current += delta;
            setSummary((s) => s + delta);
          }
          break;
        }
        case "done": {
          const d = JSON.parse(raw) as { id: string; createdAt: string; topTags: string[] };
          setHistory((h) =>
            [
              { id: d.id, createdAt: d.createdAt, topTags: d.topTags, summary: summaryRef.current },
              ...h,
            ].slice(0, 5)
          );
          setStatus("done");
          break;
        }
        case "error": {
          const e = JSON.parse(raw) as { message: string };
          setError(e.message || "Stream error");
          setStatus("error");
          break;
        }
      }
    } catch {
      // ignore malformed frame
    }
  }

  async function run() {
    if (status === "streaming") return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const myRunId = ++runIdRef.current;

    resetForRun();
    setStatus("streaming");

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!ac.signal.aborted && myRunId === runIdRef.current) {
          setError("Stream stalled — no data for 30s.");
          setStatus("error");
        }
        ac.abort();
      }, STREAM_IDLE_TIMEOUT_MS);
    };
    const clearIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    let res: Response;
    try {
      resetIdle();
      res = await fetch("/api/analytics/ai-analysis", {
        method: "POST",
        signal: ac.signal,
      });
    } catch {
      clearIdle();
      if (ac.signal.aborted || myRunId !== runIdRef.current) return;
      setError("Network error. Please try again.");
      setStatus("error");
      return;
    }

    if (!res.ok || !res.body) {
      clearIdle();
      if (myRunId !== runIdRef.current) return;
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {
        // ignore
      }
      setError(msg);
      setStatus("error");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        if (ac.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        resetIdle();
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          if (frame.trim()) handleFrame(frame, myRunId);
        }
      }
    } catch {
      if (!ac.signal.aborted && myRunId === runIdRef.current) {
        setError("Connection lost.");
        setStatus("error");
      }
    } finally {
      clearIdle();
    }
  }

  const isStreaming = status === "streaming";
  const buttonLabel = isStreaming
    ? "Running…"
    : status === "done" || status === "error"
    ? "Run again"
    : "Run analysis";

  const improvementHasContent =
    improvement &&
    (improvement.improvedByScore.length > 0 ||
      improvement.regressedByScore.length > 0 ||
      improvement.newToTop5.length > 0 ||
      improvement.stillInTop5.length > 0 ||
      improvement.droppedFromTop5.length > 0);

  const showLatestPanel = topTags.length > 0 || improvementHasContent || summary || isStreaming;

  return (
    <div style={{ maxWidth: 880 }}>
      {/* Run row */}
      <div
        className="aa-card"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}
      >
        <div>
          <div style={{ color: "var(--rc-ink)", fontSize: 14, fontWeight: 500 }}>
            Run analysis on your synced data
          </div>
          <div style={{ color: "var(--rc-on-dark-mute)", fontSize: 13, marginTop: 4 }}>
            Analyzes synced problems and contest failures.
          </div>
        </div>
        <button className="aa-btn aa-btn-primary" onClick={run} disabled={isStreaming}>
          {isStreaming ? <span className="aa-spin" /> : Icon.spark()}
          {buttonLabel}
        </button>
      </div>

      {error && (
        <div className="aa-banner err" style={{ marginTop: 18 }}>
          <span style={{ color: "var(--rc-ink)", fontWeight: 500 }}>Failed:</span> {error}
        </div>
      )}

      {showLatestPanel && (
        <div className="aa-card" style={{ marginTop: 18 }}>
          <div className="aa-card-eyebrow" style={{ marginBottom: 14 }}>
            Latest report
          </div>

          {topTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
              {topTags.map((t) => (
                <span key={t} className="aa-tag">{t}</span>
              ))}
            </div>
          )}

          {improvementHasContent && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              <ImprovementRow label="Improved" items={improvement!.improvedByScore.map((d) => d.topic)} />
              <ImprovementRow label="Regressed" items={improvement!.regressedByScore.map((d) => d.topic)} />
              <ImprovementRow label="New" items={improvement!.newToTop5} />
              <ImprovementRow label="Recurring" items={improvement!.stillInTop5} />
              <ImprovementRow label="Dropped" items={improvement!.droppedFromTop5} />
            </div>
          )}

          {(summary || isStreaming) && (
            <div
              style={{
                paddingTop: improvementHasContent || topTags.length > 0 ? 16 : 0,
                borderTop: improvementHasContent || topTags.length > 0 ? "1px solid var(--rc-hairline)" : "none",
              }}
              className="aa-prose"
            >
              <ReactMarkdown components={markdownComponents}>{summary}</ReactMarkdown>
              {isStreaming && <span style={{ display: "inline-block", animation: "aa-blink 1s steps(1) infinite" }}>▍</span>}
            </div>
          )}
        </div>
      )}

      <div className="aa-eyebrow-label" style={{ marginTop: 32, marginBottom: 12 }}>
        Previous
      </div>

      {history.length === 0 ? (
        <p style={{ color: "var(--rc-mute)", fontSize: 13 }}>No prior analyses yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((h) => {
            const open = expandedHistoryId === h.id;
            return (
              <div key={h.id}>
                <button
                  onClick={() => setExpandedHistoryId(open ? null : h.id)}
                  className="aa-prev-row"
                  type="button"
                >
                  <span className="when">{formatDate(h.createdAt)}</span>
                  <div className="tags">
                    {h.topTags.slice(0, 3).map((t) => (
                      <span key={t} className="aa-tag">{t}</span>
                    ))}
                  </div>
                  <span className={"chev " + (open ? "open" : "")}>{Icon.chev()}</span>
                </button>
                {open && (
                  <div className="aa-card aa-prose" style={{ marginTop: 8 }}>
                    <ReactMarkdown components={markdownComponents}>{h.summary}</ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
