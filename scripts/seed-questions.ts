import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getProblemList } from "../lib/leetcode";

function mapDifficulty(d: string): "EASY" | "MEDIUM" | "HARD" {
  if (d === "Easy") return "EASY";
  if (d === "Hard") return "HARD";
  return "MEDIUM";
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const BATCH = 100;
  let skip = 0;
  let total = Infinity;
  let upserted = 0;
  let skipped = 0;

  console.log("Seeding LeetCode question bank...\n");

  while (skip < total) {
    const data = await getProblemList(skip, BATCH);
    total = data.questionList.total;

    for (const q of data.questionList.questions) {
      if (q.isPaidOnly) { skipped++; continue; }
      const id = parseInt(q.questionFrontendId);
      if (isNaN(id)) { skipped++; continue; }

      await prisma.question.upsert({
        where: { slug: q.titleSlug },
        update: {
          title: q.title,
          difficulty: mapDifficulty(q.difficulty),
          tags: q.topicTags.map((t) => t.name),
        },
        create: {
          leetcodeId: id,
          slug: q.titleSlug,
          title: q.title,
          difficulty: mapDifficulty(q.difficulty),
          tags: q.topicTags.map((t) => t.name),
        },
      });
      upserted++;
    }

    console.log(`  ${upserted} upserted, ${skipped} skipped — ${Math.min(skip + BATCH, total)}/${total} fetched`);
    skip += BATCH;
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. ${upserted} questions seeded, ${skipped} skipped (paid/invalid).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
