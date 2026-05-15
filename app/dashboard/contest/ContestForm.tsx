"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DURATIONS = [30, 60, 90, 120] as const;

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
    <div className="space-y-6">
      {/* Topics */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
        <p className="text-xs text-[#737373] mb-1 font-medium uppercase tracking-wider">Topics</p>
        <p className="text-xs text-[#4a4a4a] mb-4">Leave empty for any topic</p>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const active = selectedTopics.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTopic(tag)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  active
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                    : "bg-transparent border-[#2f2f2f] text-[#737373] hover:text-white hover:border-[#4f4f4f]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
        <p className="text-xs text-[#737373] mb-4 font-medium uppercase tracking-wider">Difficulty</p>
        <div className="flex gap-2">
          {(["", "EASY", "MEDIUM", "HARD"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors border ${
                difficulty === d
                  ? d === ""
                    ? "bg-[#2a2a2a] border-[#4f4f4f] text-white"
                    : d === "EASY"
                    ? "bg-green-500/10 border-green-500/40 text-green-400"
                    : d === "MEDIUM"
                    ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
                    : "bg-red-500/10 border-red-500/40 text-red-400"
                  : "bg-transparent border-[#2f2f2f] text-[#737373] hover:text-white hover:border-[#4f4f4f]"
              }`}
            >
              {d === "" ? "Any" : d.charAt(0) + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
          <p className="text-xs text-[#737373] mb-4 font-medium uppercase tracking-wider">Questions</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg border border-[#2f2f2f] text-[#737373] hover:text-white hover:border-[#4f4f4f] transition-colors flex items-center justify-center text-lg"
            >
              −
            </button>
            <span className="flex-1 text-center text-xl font-bold text-white">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="w-8 h-8 rounded-lg border border-[#2f2f2f] text-[#737373] hover:text-white hover:border-[#4f4f4f] transition-colors flex items-center justify-center text-lg"
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
          <p className="text-xs text-[#737373] mb-4 font-medium uppercase tracking-wider">Duration</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDurationMinutes(d)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  durationMinutes === d
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                    : "bg-transparent border-[#2f2f2f] text-[#737373] hover:text-white hover:border-[#4f4f4f]"
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
            Creating contest…
          </>
        ) : (
          "Start Contest"
        )}
      </button>
    </div>
  );
}
