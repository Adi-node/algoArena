import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestion, isCategory } from "@/lib/practice";

const PISTON_URL = process.env.PISTON_URL ?? "http://localhost:2000";
const PASS_TOKEN = "__TEST_PASSED__";

interface PistonResponse {
  run?: { stdout?: string; stderr?: string; output?: string; code?: number };
  message?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { questionId?: string; category?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { questionId, category, code } = body;
  if (!questionId || !category || typeof code !== "string") {
    return NextResponse.json({ error: "questionId, category, code required" }, { status: 400 });
  }
  if (!isCategory(category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }

  const question = await getQuestion(category, questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const finalCode = code + "\n" + question.hiddenTestCode;

  let piston: PistonResponse;
  try {
    const res = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "javascript",
        version: "20.11.1",
        files: [{ name: "main.js", content: finalCode }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Piston error ${res.status}: ${text}` },
        { status: 502 }
      );
    }
    piston = (await res.json()) as PistonResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: `Piston unreachable at ${PISTON_URL}: ${msg}` },
      { status: 502 }
    );
  }

  const stdout = piston.run?.stdout ?? "";
  const stderr = piston.run?.stderr ?? "";
  const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
  const passed = stdout.includes(PASS_TOKEN);

  await prisma.practiceAttempt.create({
    data: {
      userId: session.user.id,
      questionId,
      category,
      code,
      output: combined,
      status: passed ? "PASSED" : "ATTEMPTED",
    },
  });

  return NextResponse.json({
    passed,
    output: combined,
    stderr: stderr.trim(),
    stdout: stdout.trim(),
  });
}
