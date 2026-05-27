import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchAllSolvedSlugs,
  getQuestionDetail,
  getUserCalendar,
  leetcodeUserTag,
} from "@/lib/leetcode";
import type { Difficulty } from "@/app/generated/prisma/client";

function mapDifficulty(d: string): Difficulty {
  if (d === "Easy") return "EASY";
  if (d === "Hard") return "HARD";
  return "MEDIUM";
}

const DETAIL_CONCURRENCY = 5;

async function fetchDetailsInChunks(slugs: string[]) {
  const results: Array<{ slug: string; difficulty: Difficulty; tags: string[]; leetcodeId: number; title: string } | null> = [];
  for (let i = 0; i < slugs.length; i += DETAIL_CONCURRENCY) {
    const chunk = slugs.slice(i, i + DETAIL_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((slug) =>
        getQuestionDetail(slug)
          .then((d) => {
            const id = parseInt(d.question.questionId);
            if (isNaN(id)) return null;
            return {
              slug,
              difficulty: mapDifficulty(d.question.difficulty),
              tags: d.question.topicTags.map((t) => t.name),
              leetcodeId: id,
              title: d.question.title,
            };
          })
          .catch(() => null)
      )
    );
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Spread `slugCount` solved dates across the user's actual submission days,
 * proportional to that day's submission count. Returns one Date per slug, in
 * descending order (newest first), matching the order LeetCode returns slugs in.
 *
 * Falls back to evenly-spaced dates across the last 365 days if the calendar
 * is empty or missing.
 */
function distributeDates(slugCount: number, submissionCalendarJson: string | undefined): Date[] {
  const fallback = () => {
    const now = Date.now();
    const dayMs = 86_400_000;
    return Array.from({ length: slugCount }, (_, i) => new Date(now - i * dayMs));
  };
  if (!submissionCalendarJson) return fallback();

  let calendar: Record<string, number>;
  try {
    const parsed = JSON.parse(submissionCalendarJson);
    calendar = Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, Number(v)])
    );
  } catch {
    return fallback();
  }

  const entries = Object.entries(calendar)
    .map(([ts, count]) => ({ date: new Date(Number(ts) * 1000), count }))
    .filter((e) => e.count > 0 && !isNaN(e.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // newest first

  const total = entries.reduce((acc, e) => acc + e.count, 0);
  if (total === 0) return fallback();

  const dates: Date[] = [];
  // Walk newest day → oldest, taking ceil(count/total * slugCount) per day until full.
  for (const e of entries) {
    if (dates.length >= slugCount) break;
    const share = Math.max(1, Math.round((e.count / total) * slugCount));
    for (let i = 0; i < share && dates.length < slugCount; i++) {
      dates.push(e.date);
    }
  }
  // Pad with the oldest known activity date if we ran short.
  const oldest = entries[entries.length - 1]?.date ?? new Date();
  while (dates.length < slugCount) dates.push(oldest);
  return dates;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { leetcodeSession } = (await req.json()) as { leetcodeSession?: string };
  if (!leetcodeSession?.trim()) {
    return NextResponse.json({ error: "LEETCODE_SESSION required" }, { status: 400 });
  }

  let slugs: string[];
  try {
    slugs = await fetchAllSolvedSlugs(leetcodeSession.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch from LeetCode";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { leetcodeUsername: true },
  });
  const lcUsername = userRecord?.leetcodeUsername;

  // Only fetch details for slugs we don't already have in our Question table.
  const known = await prisma.question.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, leetcodeId: true },
  });
  const knownBySlug = new Map(known.map((q) => [q.slug, q]));
  const unknownSlugs = slugs.filter((s) => !knownBySlug.has(s));

  const details = await fetchDetailsInChunks(unknownSlugs);
  const newQuestionRows = details.filter((d): d is NonNullable<typeof d> => d !== null);

  // Create missing Question rows in one transaction.
  if (newQuestionRows.length > 0) {
    const created = await prisma.$transaction(
      newQuestionRows.map((d) =>
        prisma.question.upsert({
          where: { leetcodeId: d.leetcodeId },
          update: { slug: d.slug, title: d.title, difficulty: d.difficulty, tags: d.tags },
          create: {
            leetcodeId: d.leetcodeId,
            slug: d.slug,
            title: d.title,
            difficulty: d.difficulty,
            tags: d.tags,
          },
        })
      )
    );
    created.forEach((q) => knownBySlug.set(q.slug, { id: q.id, slug: q.slug, leetcodeId: q.leetcodeId }));
  }

  // Distribute realistic solvedAt dates across the user's actual activity calendar.
  let submissionCalendar: string | undefined;
  if (lcUsername) {
    try {
      const cal = await getUserCalendar(lcUsername, userId);
      submissionCalendar = cal.matchedUser?.userCalendar?.submissionCalendar;
    } catch {
      // non-fatal — fall back to spaced dates
    }
  }
  const dates = distributeDates(slugs.length, submissionCalendar);

  // Find pre-existing UserSolved rows so "added" counts only new records.
  const allQuestionIds = slugs
    .map((s) => knownBySlug.get(s)?.id)
    .filter((id): id is string => !!id);
  const preExisting = await prisma.userSolved.findMany({
    where: { userId, questionId: { in: allQuestionIds } },
    select: { questionId: true },
  });
  const preExistingSet = new Set(preExisting.map((r) => r.questionId));

  const writes = slugs
    .map((slug, i) => {
      const q = knownBySlug.get(slug);
      if (!q) return null;
      return {
        questionId: q.id,
        solvedAt: dates[i] ?? new Date(),
      };
    })
    .filter((w): w is { questionId: string; solvedAt: Date } => !!w && !preExistingSet.has(w.questionId));

  if (writes.length > 0) {
    await prisma.$transaction(
      writes.map((w) =>
        prisma.userSolved.create({
          data: { userId, questionId: w.questionId, solvedAt: w.solvedAt, language: "" },
        })
      )
    );
  }

  revalidateTag(leetcodeUserTag(userId), "max");

  return NextResponse.json({
    totalSlugs: slugs.length,
    added: writes.length,
    questionsCreated: newQuestionRows.length,
  });
}
