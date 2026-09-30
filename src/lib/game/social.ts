import type { Prisma, CategoryKey } from "@prisma/client";
import { levelFromXp } from "./xp";

/** Called inside the achievement transaction with the FINAL server-approved XP. Nothing here creates XP. */
export async function applyAward(tx: Prisma.TransactionClient, userId: string, category: CategoryKey, xp: number) {
  const now = new Date();
  const rows = await tx.challengeParticipant.findMany({
    where: { userId, challenge: { startsAt: { lte: now }, endsAt: { gte: now }, completedAt: null, OR: [{ category: null }, { category }] } },
    include: { challenge: true } });
  for (const r of rows) {
    const progress = r.progressXp + xp, c = r.challenge;
    await tx.challengeParticipant.update({ where: { challengeId_userId: { challengeId: c.id, userId } }, data: { progressXp: progress } });
    if (!c.xpTarget) continue;
    const total = (await tx.challengeParticipant.aggregate({ where: { challengeId: c.id }, _sum: { progressXp: true } }))._sum.progressXp ?? 0;
    if ((c.kind === "PARTY" ? total : progress) >= c.xpTarget) { // PARTY = collective target, others = first to reach it
      await tx.challenge.update({ where: { id: c.id }, data: { completedAt: now } });
      const all = await tx.challengeParticipant.findMany({ where: { challengeId: c.id }, select: { userId: true } });
      await tx.notification.createMany({ data: all.map(p => ({ userId: p.userId, type: "CHALLENGE_DONE", body: `Challenge complete: ${c.title}` })) });
    }
  }
  for (const g of await tx.guildMember.findMany({ where: { userId } })) {
    const u = await tx.guild.update({ where: { id: g.guildId }, data: { totalXp: { increment: xp } } });
    await tx.guild.update({ where: { id: g.guildId }, data: { level: levelFromXp(Math.round(u.totalXp / 5)) } });
  }
}
