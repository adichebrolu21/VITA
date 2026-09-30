import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { logAchievement, rateLimited } from "@/lib/game/log";

// Body is text + optional metadata ONLY. XP is never accepted from the client.
const Body = z.object({ text: z.string().trim().min(3).max(400), occurredOn: z.coerce.date().max(new Date(Date.now() + 864e5)).optional(), notes: z.string().max(1000).optional() });

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (rateLimited(s.user.id)) return NextResponse.json({ error: "Slow down" }, { status: 429 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { text, ...extra } = p.data;
  return NextResponse.json(await logAchievement(s.user.id, text, extra), { status: 201 });
}
