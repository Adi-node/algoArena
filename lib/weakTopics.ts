import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@/app/generated/prisma/client";

const WHITELIST = new Set<string>([
  "Array",
  "Hash Table",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Dynamic Programming",
  "Graph",
  "Tree",
  "Breadth-First Search",
  "Depth-First Search",
  "Backtracking",
  "Greedy",
  "Heap (Priority Queue)",
  "Trie",
  "Stack",
  "Queue",
  "Linked List",
  "Recursion",
  "Bit Manipulation",
  "Sorting",
]);

const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  EASY: 1.0,
  MEDIUM: 1.5,
  HARD: 2.0,
};

const HALF_LIFE_DAYS = 90;
const ALPHA = 3.0;
const BETA = 1.0;
const BLIND_SPOT_RATIO = 0.5;
const MS_PER_DAY = 86_400_000;

function recencyWeight(date: Date, now = Date.now()): number {
  const daysAgo = (now - date.getTime()) / MS_PER_DAY;
  return Math.pow(0.5, Math.max(0, daysAgo) / HALF_LIFE_DAYS);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

type FailureSource = "leetcode-contest" | "in-app-contest";

interface FailureEvidence {
  slug: string;
  title: string;
  difficulty: Difficulty;
  source: FailureSource;
  date: string;
}

export interface TopicScore {
  topic: string;
  struggleScore: number;
  blindSpotScore: number;
  weaknessScore: number;
  solvedCount: number;
  failedCount: number;
  reasons: string[];
  evidence: {
    failures: FailureEvidence[];
    solvedCount: number;
  };
}

export interface WeakTopicsResult {
  struggleAreas: TopicScore[];
  blindSpots: TopicScore[];
  all: TopicScore[];
  meta: {
    medianSolved: number;
    blindSpotThreshold: number;
    totalFailuresAnalyzed: number;
    totalSolvedAnalyzed: number;
    generatedAt: string;
  };
}

export async function computeWeakTopics(
  userId: string
): Promise<WeakTopicsResult> {
  const [solved, lcFailures, inAppFailures] = await Promise.all([
    prisma.userSolved.findMany({
      where: { userId },
      select: {
        solvedAt: true,
        question: { select: { tags: true, difficulty: true } },
      },
    }),
    prisma.upsolvingItem.findMany({
      where: { userId },
      select: {
        contestDate: true,
        question: {
          select: { slug: true, title: true, tags: true, difficulty: true },
        },
      },
    }),
    prisma.contestQuestion.findMany({
      where: {
        solved: false,
        contestSession: { userId, status: "COMPLETED" },
      },
      select: {
        contestSession: { select: { startedAt: true } },
        question: {
          select: { slug: true, title: true, tags: true, difficulty: true },
        },
      },
    }),
  ]);

  const topics: Record<string, TopicScore> = {};
  // Per-topic slug-set to dedupe failure evidence — the same multi-tagged problem
  // would otherwise appear N times (once per matching tag) in the LLM prompt.
  const seenFailuresByTopic: Record<string, Set<string>> = {};
  for (const t of WHITELIST) {
    topics[t] = {
      topic: t,
      struggleScore: 0,
      blindSpotScore: 0,
      weaknessScore: 0,
      solvedCount: 0,
      failedCount: 0,
      reasons: [],
      evidence: { failures: [], solvedCount: 0 },
    };
    seenFailuresByTopic[t] = new Set();
  }

  for (const s of solved) {
    for (const tag of s.question.tags) {
      const bucket = topics[tag];
      if (!bucket) continue;
      bucket.solvedCount += 1;
      bucket.evidence.solvedCount += 1;
    }
  }

  const recordFailure = (
    tags: string[],
    difficulty: Difficulty,
    date: Date,
    slug: string,
    title: string,
    source: FailureSource
  ) => {
    const w = recencyWeight(date) * DIFFICULTY_WEIGHT[difficulty];
    const iso = date.toISOString();
    for (const tag of tags) {
      const bucket = topics[tag];
      if (!bucket) continue;
      bucket.struggleScore += w;
      bucket.failedCount += 1;
      const seen = seenFailuresByTopic[tag];
      if (!seen.has(slug)) {
        seen.add(slug);
        bucket.evidence.failures.push({ slug, title, difficulty, source, date: iso });
      }
    }
  };

  for (const f of lcFailures) {
    recordFailure(
      f.question.tags,
      f.question.difficulty,
      f.contestDate,
      f.question.slug,
      f.question.title,
      "leetcode-contest"
    );
  }
  for (const f of inAppFailures) {
    recordFailure(
      f.question.tags,
      f.question.difficulty,
      f.contestSession.startedAt,
      f.question.slug,
      f.question.title,
      "in-app-contest"
    );
  }

  const solvedCounts = Object.values(topics).map((t) => t.solvedCount);
  const med = median(solvedCounts);
  const threshold = med * BLIND_SPOT_RATIO;

  for (const t of Object.values(topics)) {
    if (threshold > 0) {
      t.blindSpotScore = Math.max(0, 1 - t.solvedCount / threshold);
    } else {
      t.blindSpotScore = t.solvedCount === 0 ? 1 : 0;
    }
  }

  const maxStruggle = Math.max(
    0,
    ...Object.values(topics).map((t) => t.struggleScore)
  );
  for (const t of Object.values(topics)) {
    const normStruggle = maxStruggle > 0 ? t.struggleScore / maxStruggle : 0;
    t.weaknessScore = ALPHA * normStruggle + BETA * t.blindSpotScore;

    if (t.failedCount > 0) {
      t.reasons.push(
        `${t.failedCount} contest failure${t.failedCount > 1 ? "s" : ""} (recency- and difficulty-weighted)`
      );
    }
    if (t.blindSpotScore > 0) {
      t.reasons.push(
        `low coverage: ${t.solvedCount} solved vs median ${med} across core topics`
      );
    }
  }

  const all = Object.values(topics).sort(
    (a, b) => b.weaknessScore - a.weaknessScore
  );
  const struggleAreas = [...all]
    .filter((t) => t.struggleScore > 0)
    .sort((a, b) => b.struggleScore - a.struggleScore);
  const blindSpots = [...all]
    .filter((t) => t.blindSpotScore > 0)
    .sort((a, b) => b.blindSpotScore - a.blindSpotScore);

  return {
    struggleAreas,
    blindSpots,
    all,
    meta: {
      medianSolved: med,
      blindSpotThreshold: threshold,
      totalFailuresAnalyzed: lcFailures.length + inAppFailures.length,
      totalSolvedAnalyzed: solved.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

