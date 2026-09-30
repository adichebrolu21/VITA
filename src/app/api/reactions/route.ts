import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canSee } from "@/lib/privacy";

const B = z.object({ activityId: z.string().min(1), emoji: z.enum(["🔥", "❤️", "⚔️", "🏆"]) });
export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = B.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const act = await prisma.activity.findUnique({ where: { id: p.data.activityId }, select: { userId: true } });
  if (!act || !(await canSee(s.user.id, act.userId, "activity"))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const key = { activityId_userId_emoji: { activityId: p.data.activityId, userId: s.user.id, emoji: p.data.emoji } };
  const had = await prisma.reaction.findUnique({ where: key });
  if (had) await prisma.reaction.delete({ where: key });
  else {
    await prisma.reaction.create({ data: { activityId: p.data.activityId, userId: s.user.id, emoji: p.data.emoji } });
    if (act.userId !== s.user.id) await prisma.notification.create({ data: { userId: act.userId, type: "REACTION", body: `${s.user.name ?? "A friend"} reacted ${p.data.emoji} to your achievement` } });
  }
  return NextResponse.json({ on: !had });
}
