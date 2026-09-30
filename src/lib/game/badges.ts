import type { Prisma } from "@prisma/client";
type Tx = Prisma.TransactionClient;
type Ctx = { momentum: number; level: number };
const n = (tx: Tx, uid: string, cat: string) => tx.achievement.count({ where: { userId: uid, primaryCategory: cat as any } });

const DEFS: { slug: string; name: string; icon: string; description: string; rarity: "COMMON" | "RARE" | "LEGENDARY"; test: (tx: Tx, uid: string, c: Ctx) => Promise<boolean> }[] = [
  { slug: "first-step", name: "First Step", icon: "🏃", description: "Complete your first fitness achievement.", rarity: "COMMON", test: async (t, u) => (await n(t, u, "FITNESS")) >= 1 },
  { slug: "on-fire", name: "On Fire", icon: "🔥", description: "Reach high momentum.", rarity: "RARE", test: async (_t, _u, c) => c.momentum >= 1.3 },
  { slug: "scholar", name: "Scholar", icon: "🧠", description: "Reach Knowledge Level 20.", rarity: "RARE",
    test: async (t, u) => ((await t.userCategoryXP.findUnique({ where: { userId_category: { userId: u, category: "KNOWLEDGE" } } }))?.level ?? 0) >= 20 },
  { slug: "career-arc", name: "Career Arc", icon: "💼", description: "Complete 5 career milestones.", rarity: "RARE", test: async (t, u) => (await n(t, u, "CAREER")) >= 5 },
  { slug: "builder", name: "Builder", icon: "🛠️", description: "Complete 10 creation achievements.", rarity: "RARE", test: async (t, u) => (await n(t, u, "CREATION")) >= 10 },
  { slug: "explorer", name: "Explorer", icon: "🌎", description: "Complete 5 exploration achievements.", rarity: "COMMON", test: async (t, u) => (await n(t, u, "EXPLORATION")) >= 5 },
  { slug: "level-50", name: "Level 50", icon: "🏆", description: "Reach overall Level 50.", rarity: "LEGENDARY", test: async (_t, _u, c) => c.level >= 50 },
];

/** Runs inside the achievement transaction. Badges carry no XP, so they cannot be farmed for progression. */
export async function checkBadges(tx: Tx, uid: string, ctx: Ctx) {
  const have = new Set((await tx.userBadge.findMany({ where: { userId: uid }, include: { badge: true } })).map(b => b.badge.slug));
  for (const d of DEFS) {
    if (have.has(d.slug) || !(await d.test(tx, uid, ctx))) continue;
    const badge = await tx.badge.upsert({ where: { slug: d.slug }, update: {}, create: { slug: d.slug, name: d.name, icon: d.icon, description: d.description, rarity: d.rarity } });
    await tx.userBadge.create({ data: { userId: uid, badgeId: badge.id } });
    await tx.activity.create({ data: { userId: uid, type: "BADGE", payload: { name: d.name, icon: d.icon } } });
    await tx.notification.create({ data: { userId: uid, type: "BADGE", body: `Achievement unlocked: ${d.name}` } });
  }
}
