import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeWeakTopics, type TopicScore, type WeakTopicsResult } from "@/lib/weakTopics";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOP_N = 5;
const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${payload}\n\n`);
}

interface ImprovementEntry {
  topic: string;
  previousScore: number;
  currentScore: number;
  delta: number;
}

interface ImprovementReport {
  droppedFromTop5: string[];        // topics that were top-5 last time, now aren't
  stillInTop5: string[];            // topics still on the list — recurring weakness
  newToTop5: string[];              // newly surfaced weaknesses
  improvedByScore: ImprovementEntry[];   // negative delta — getting better
  regressedByScore: ImprovementEntry[];  // positive delta — getting worse
}

function computeImprovement(
  current: WeakTopicsResult,
  prev: { topTags: string[]; scoresJson: unknown } | null
): ImprovementReport {
  const currentTop = current.all.slice(0, TOP_N).map((t) => t.topic);
  if (!prev) {
    return {
      droppedFromTop5: [],
      stillInTop5: [],
      newToTop5: currentTop,
      improvedByScore: [],
      regressedByScore: [],
    };
  }
  const prevTop = prev.topTags ?? [];
  const droppedFromTop5 = prevTop.filter((t) => !currentTop.includes(t));
  const stillInTop5 = currentTop.filter((t) => prevTop.includes(t));
  const newToTop5 = currentTop.filter((t) => !prevTop.includes(t));

  const prevScores: Record<string, number> = {};
  const prevAll = (prev.scoresJson as WeakTopicsResult | null)?.all ?? [];
  for (const t of prevAll) prevScores[t.topic] = t.weaknessScore;

  const deltas: ImprovementEntry[] = current.all.map((t) => ({
    topic: t.topic,
    previousScore: prevScores[t.topic] ?? 0,
    currentScore: t.weaknessScore,
    delta: t.weaknessScore - (prevScores[t.topic] ?? 0),
  }));

  return {
    droppedFromTop5,
    stillInTop5,
    newToTop5,
    improvedByScore: deltas
      .filter((d) => d.delta < -0.05)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, TOP_N),
    regressedByScore: deltas
      .filter((d) => d.delta > 0.05)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, TOP_N),
  };
}

function buildPrompt(
  current: WeakTopicsResult,
  improvement: ImprovementReport,
  prevSummary: string | null
): { system: string; human: string } {
  const trim = (s: TopicScore[]) =>
    s.slice(0, TOP_N).map((t) => ({
      topic: t.topic,
      solved: t.solvedCount,
      failed: t.failedCount,
      reasons: t.reasons,
      sampleFailures: t.evidence.failures.slice(0, 5).map((f) => ({
        title: f.title,
        difficulty: f.difficulty,
        source: f.source,
        date: f.date.slice(0, 10),
      })),
    }));

  const system = `You are a senior DSA interview coach. Produce a concise, actionable weakness report (~250 words max).

Hard rules:
- NEVER mention numeric scores (weakness/struggle/blind-spot). Use plain language only.
- Recommend ONLY well-known LeetCode problems you are certain exist. Format each as a clickable markdown link: [LC N: Title](https://leetcode.com/problems/slug/). Never invent slugs or numbers.
- Be direct. No filler ("great question", "as an AI", "let me know").
- Output markdown — no outer code fences.

Required structure:

## Headline
One sentence naming the single most urgent topic.

## Top 5 Weak Areas
For each of the 5 topics, two lines:
**Topic Name**
- Why: one short line (contest failures vs blind spot — fold in any recurring/regressed signal).
- Drill: exactly 3 problems as clickable links.

## Improvement
One short paragraph naming progressed/dropped topics. If no prior analysis exists, write exactly: "First analysis — no comparison yet."

## Next 6 Days
Exactly 6 bullets, one per day, weighted toward recurring/regressed topics.`;

  const human = `## Current weak-topic snapshot
\`\`\`json
${JSON.stringify(
  {
    struggleAreas: trim(current.struggleAreas),
    blindSpots: trim(current.blindSpots),
    top5Combined: trim(current.all),
    meta: current.meta,
  },
  null,
  2
)}
\`\`\`

## Improvement signals vs previous analysis
\`\`\`json
${JSON.stringify(improvement, null, 2)}
\`\`\`

${
  prevSummary
    ? `## Previous analysis summary (for continuity)\n${prevSummary}\n`
    : `## Previous analysis\n(none — this is the first analysis for this user)\n`
}`;

  return { system, human };
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const userId = session.user.id;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  const baseURL = process.env.OPENROUTER_BASE_URL;
  if (!apiKey || !model || !baseURL) {
    return new Response(
      JSON.stringify({
        error:
          "Missing OPENROUTER_API_KEY / OPENROUTER_MODEL / OPENROUTER_BASE_URL env vars.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const current = await computeWeakTopics(userId);

  const prev = await prisma.weakTopicAnalysis.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { topTags: true, summary: true, scoresJson: true },
  });

  const improvement = computeImprovement(
    current,
    prev ? { topTags: prev.topTags, scoresJson: prev.scoresJson } : null
  );

  const { system: systemPrompt, human: humanPrompt } = buildPrompt(
    current,
    improvement,
    prev?.summary ?? null
  );

  const llm = new ChatOpenAI({
    apiKey,
    model,
    streaming: true,
    temperature: 0.4,
    configuration: { baseURL },
  });

  const topTags = current.all.slice(0, TOP_N).map((t) => t.topic);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(sse(event, data));

      try {
        send("meta", {
          medianSolved: current.meta.medianSolved,
          totalFailuresAnalyzed: current.meta.totalFailuresAnalyzed,
          totalSolvedAnalyzed: current.meta.totalSolvedAnalyzed,
        });
        send("topTags", topTags);
        send("improvement", improvement);

        const tokenStream = await llm.stream([
          new SystemMessage(systemPrompt),
          new HumanMessage(humanPrompt),
        ]);

        let fullText = "";
        for await (const chunk of tokenStream) {
          const piece =
            typeof chunk.content === "string"
              ? chunk.content
              : Array.isArray(chunk.content)
              ? chunk.content
                  .map((c) =>
                    typeof c === "string"
                      ? c
                      : "text" in c && typeof c.text === "string"
                      ? c.text
                      : ""
                  )
                  .join("")
              : "";
          if (!piece) continue;
          fullText += piece;
          send("token", { delta: piece });
        }

        const saved = await prisma.weakTopicAnalysis.create({
          data: {
            userId,
            topTags,
            summary: fullText,
            scoresJson: current as unknown as object,
          },
          select: { id: true, createdAt: true },
        });

        send("done", {
          id: saved.id,
          createdAt: saved.createdAt.toISOString(),
          topTags,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send("error", { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
