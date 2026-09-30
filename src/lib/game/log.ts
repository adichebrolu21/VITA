import { prisma } from "@/lib/prisma";
import { GAME } from "./config";
import { getGameMaster } from "./evaluator";
import { applyAward } from "./social";
import { checkBadges } from "./badges";
import { awardXp, levelFromXp, momentumOnLog, statLevel, titleForLevel } from "./xp";

const hits = new Map<string, number[]>(); // swap for Redis in production
export function rateLimited(uid: string) {
  const now = Date.now(), w = (hits.get(uid) ?? []).filter(t => now - t < GAME.rateLimit.windowMs);
  w.push(now); hits.set(uid, w); return w.length > GAME.rateLimit.max;
}

export async function logAchievement(uid: string, text: string, extra: { occurredOn?: Date; notes?: string } = {}) {
  const gm = getGameMaster(), ev = await gm.evaluate(text);
  return prisma.$transaction(async tx => {
    const profile = await tx.profile.findUniqueOrThrow({ where: { userId: uid } });
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const same = await tx.achievement.count({ where: { userId: uid, primaryCategory: ev.category, createdAt: { gte: startOfDay } } });
    const mom = momentumOnLog(profile.momentum, profile.lastActiveOn);
    const award = awardXp(ev, { sameCategoryToday: same, momentum: mom.value });
    const ach = await tx.achievement.create({ data: {
      userId: uid, text, ...extra, primaryCategory: ev.category, secondaryCategory: ev.secondaryCategory, xpAwarded: award.finalXp,
      evaluation: { create: { difficulty: ev.difficulty, effort: ev.effort, impact: ev.impact, rarity: ev.rarity, timeInvestment: ev.timeInvestment,
        consistency: ev.consistency, llmRecommendedXp: ev.recommendedXP, formulaXp: award.formulaXp, repeatFactor: award.repeatFactor,
        momentumFactor: award.momentumFactor, finalXp: award.finalXp, reason: ev.reason, evaluator: gm.id } } },
      include: { evaluation: true } });
    const split: [typeof ev.category, number][] = ev.secondaryCategory
      ? [[ev.category, Math.round(award.finalXp * (1 - GAME.secondaryShare))], [ev.secondaryCategory, Math.round(award.finalXp * GAME.secondaryShare)]]
      : [[ev.category, award.finalXp]];
    for (const [category, xp] of split) {
      const row = await tx.userCategoryXP.upsert({ where: { userId_category: { userId: uid, category } },
        create: { userId: uid, category, xp, level: statLevel(xp) }, update: { xp: { increment: xp } } });
      await tx.userCategoryXP.update({ where: { userId_category: { userId: uid, category } }, data: { level: statLevel(row.xp) } });
    }
    const totalXp = profile.totalXp + award.finalXp, oldLevel = profile.level, newLevel = levelFromXp(totalXp), newTitle = titleForLevel(newLevel);
    await tx.profile.update({ where: { userId: uid }, data: { totalXp, level: newLevel, momentum: mom.value, lastActiveOn: new Date(),
      ...(newLevel > oldLevel && newTitle !== titleForLevel(oldLevel) ? { title: newTitle } : {}) } });
    await tx.activity.create({ data: { userId: uid, type: "ACHIEVEMENT", payload: { id: ach.id, text, xp: award.finalXp, category: ev.category } } });
    if (newLevel > oldLevel) await tx.activity.create({ data: { userId: uid, type: "LEVEL_UP", payload: { from: oldLevel, to: newLevel } } });
    await applyAward(tx, uid, ev.category, award.finalXp);
    await checkBadges(tx, uid, { momentum: mom.value, level: newLevel });
    return { achievement: ach, levelUp: newLevel > oldLevel ? { from: oldLevel, to: newLevel, title: newTitle } : null, totalXp, momentum: mom.value };
  });
}
