import { promises as fs } from "fs";
import path from "path";

export type PracticeCategory = "node" | "express" | "mongodb" | "js";
export type PracticeDifficulty = "Easy" | "Medium" | "Hard";

export interface PracticeQuestion {
  id: string;
  title: string;
  description: string;
  category: PracticeCategory;
  difficulty: PracticeDifficulty;
  starterCode: string;
  hiddenTestCode: string;
}

export const CATEGORIES: { key: PracticeCategory; label: string; blurb: string }[] = [
  { key: "js",      label: "JavaScript", blurb: "Core language fundamentals, closures, prototypes, async." },
  { key: "node",    label: "Node.js",    blurb: "Streams, events, buffers, async runtime primitives." },
  { key: "express", label: "Express",    blurb: "Request/response handling, middleware, routing patterns." },
  { key: "mongodb", label: "MongoDB",    blurb: "Query construction, filters, aggregation pipelines." },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function isCategory(v: string): v is PracticeCategory {
  return (CATEGORY_KEYS as string[]).includes(v);
}

const DATA_DIR = path.join(process.cwd(), "data");

export async function getQuestionsByCategory(category: PracticeCategory): Promise<PracticeQuestion[]> {
  const file = path.join(DATA_DIR, `${category}.json`);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as PracticeQuestion[];
}

export async function getQuestion(category: PracticeCategory, id: string): Promise<PracticeQuestion | null> {
  const list = await getQuestionsByCategory(category);
  return list.find((q) => q.id === id) ?? null;
}

export async function getCategoryCounts(): Promise<Record<PracticeCategory, number>> {
  const entries = await Promise.all(
    CATEGORY_KEYS.map(async (k) => [k, (await getQuestionsByCategory(k as PracticeCategory)).length] as const)
  );
  return Object.fromEntries(entries) as Record<PracticeCategory, number>;
}
