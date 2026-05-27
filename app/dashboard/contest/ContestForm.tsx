"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DURATIONS = [30, 60, 90, 120] as const;
const DIFFICULTIES = [
  { val: "", label: "Any" },
  { val: "EASY", label: "Easy" },
  { val: "MEDIUM", label: "Medium" },
  { val: "HARD", label: "Hard" },
] as const;

interface Props {
  availableTags: string[];
}

export default function ContestForm({ availableTags }: Props) {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "">("");
  const [quantity, setQuantity] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleTopic(tag: string) {
    setSelectedTopics((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/contest/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topics: selectedTopics,
        difficulty: difficulty || null,
        quantity,
        durationMinutes,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/dashboard/contest/${data.contestId}`);
  }

  return (
    <div className="aa-section">
      {/* Topics */}
      <div className="aa-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, gap: 12 }}>
          <div>
            <div className="aa-card-eyebrow" style={{ marginBottom: 4 }}>Topics</div>
            <div style={{ color: "var(--rc-mute)", fontSize: 12 }}>
              {selectedTopics.length === 0 ? "Leave empty for any topic" : `${selectedTopics.length} selected`}
            </div>
          </div>
          {selectedTopics.length > 0 && (
            <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={() => setSelectedTopics([])}>
              Clear
            </button>
          )}
        </div>
        <div className="aa-chips">
          {availableTags.map((tag) => {
            const active = selectedTopics.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTopic(tag)}
                className={"aa-chip " + (active ? "is-on" : "")}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div className="aa-card">
        <div className="aa-card-eyebrow" style={{ marginBottom: 14 }}>Difficulty</div>
        <div className="aa-seg">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.val}
              onClick={() => setDifficulty(d.val as typeof difficulty)}
              className={"aa-seg-btn " + (difficulty === d.val ? "is-on" : "")}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity + Duration */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="aa-card">
          <div className="aa-card-eyebrow" style={{ marginBottom: 14 }}>Questions</div>
          <div className="aa-stepper">
            <button className="aa-stepper-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
            <div className="aa-stepper-val">{quantity}</div>
            <button className="aa-stepper-btn" onClick={() => setQuantity((q) => Math.min(10, q + 1))}>+</button>
          </div>
        </div>
        <div className="aa-card">
          <div className="aa-card-eyebrow" style={{ marginBottom: 14 }}>Duration</div>
          <div className="aa-dur-grid">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDurationMinutes(d)}
                className={"aa-dur " + (durationMinutes === d ? "is-on" : "")}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="aa-banner err">{error}</div>}

      <button
        className="aa-btn aa-btn-primary aa-btn-lg"
        style={{ width: "100%" }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <><span className="aa-spin" /> Creating contest…</>
        ) : (
          <>
            Start contest
            <span style={{ display: "inline-flex", gap: 3, marginLeft: 6 }}>
              <span className="aa-key aa-key-on-light">⌘</span>
              <span className="aa-key aa-key-on-light">↵</span>
            </span>
          </>
        )}
      </button>
    </div>
  );
}
