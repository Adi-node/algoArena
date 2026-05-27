"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { PracticeCategory, PracticeDifficulty } from "@/lib/practice";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div style={{ padding: 16, color: "var(--rc-mute)" }}>Loading editor…</div>,
});

interface Props {
  questionId: string;
  category: PracticeCategory;
  title: string;
  description: string;
  difficulty: PracticeDifficulty;
  initialCode: string;
}

type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; passed: boolean; output: string }
  | { kind: "error"; message: string };

export default function PracticeRoom({
  questionId,
  category,
  title,
  description,
  difficulty,
  initialCode,
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<RunState>({ kind: "idle" });

  async function runCode() {
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, category, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: data.error ?? `HTTP ${res.status}` });
        return;
      }
      setState({ kind: "done", passed: !!data.passed, output: data.output ?? "" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
    }
  }

  const diffCode = difficulty[0] as "E" | "M" | "H";

  return (
    <div className="ap-shell">
      <div className="ap-bar">
        <Link href={`/dashboard/practice/${category}`} className="aa-btn aa-btn-ghost aa-btn-sm">
          ← Back
        </Link>
        <span className={`aa-diff ${diffCode}`}>{diffCode}</span>
        <span className="ap-bar-title">{title}</span>
        <span className="aa-tag" style={{ marginLeft: "auto" }}>{category}</span>
      </div>

      <div className="ap-split">
        <section className="ap-left aa-panel">
          <div className="aa-prose">
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>
        </section>

        <section className="ap-right">
          <div className="ap-editor">
            <MonacoEditor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{
                fontFamily: "var(--rc-font-mono), monospace",
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true,
              }}
            />
          </div>

          <div className="ap-actions">
            <button
              className="aa-btn aa-btn-primary"
              onClick={runCode}
              disabled={state.kind === "running"}
            >
              {state.kind === "running" ? (
                <>
                  <span className="aa-spin" /> Running…
                </>
              ) : (
                "Run Code"
              )}
            </button>
            {state.kind === "done" && (
              <span className={`aa-tag ${state.passed ? "green" : "red"}`}>
                {state.passed ? "PASSED" : "FAILED"}
              </span>
            )}
          </div>

          <div className="ap-console">
            {state.kind === "idle" && <span className="ap-console-dim">// Output will appear here</span>}
            {state.kind === "running" && <span className="ap-console-dim">// Executing…</span>}
            {state.kind === "error" && <span style={{ color: "var(--rc-red)" }}>{state.message}</span>}
            {state.kind === "done" && (
              <pre className="ap-console-pre">{state.output || "(no output)"}</pre>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .ap-shell {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 80px);
          gap: 14px;
        }
        .ap-bar {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ap-bar-title {
          color: var(--rc-ink);
          font-size: 15px;
          font-weight: 500;
        }
        .ap-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          flex: 1;
          min-height: 0;
        }
        .ap-left {
          overflow-y: auto;
          padding: 22px 24px;
        }
        .ap-right {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
        }
        .ap-editor {
          flex: 1;
          min-height: 0;
          border: 1px solid var(--rc-hairline);
          border-radius: 10px;
          overflow: hidden;
          background: #1e1e1e;
        }
        .ap-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ap-console {
          background: #000;
          border: 1px solid var(--rc-hairline);
          border-radius: 10px;
          padding: 12px 14px;
          font-family: var(--rc-font-mono), monospace;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--rc-on-dark);
          height: 180px;
          overflow: auto;
        }
        .ap-console-dim {
          color: var(--rc-ash);
        }
        .ap-console-pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--rc-on-dark);
          font-family: inherit;
        }
        @media (max-width: 960px) {
          .ap-shell { height: auto; }
          .ap-split { grid-template-columns: 1fr; }
          .ap-editor { height: 360px; }
        }
      `}</style>
    </div>
  );
}
