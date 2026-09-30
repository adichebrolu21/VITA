import { PrismaClient, CategoryKey } from "@prisma/client";
import bcrypt from "bcryptjs";
import { levelFromXp, statLevel, titleForLevel } from "../src/lib/game/xp";
const db = new PrismaClient();
const K: CategoryKey[] = ["KNOWLEDGE","FITNESS","DISCIPLINE","CREATION","CAREER","CREATIVITY","SOCIAL","EXPLORATION","WELLBEING"];
const META: Record<CategoryKey, [string, string]> = { KNOWLEDGE: ["Knowledge","🧠"], FITNESS: ["Fitness","💪"], DISCIPLINE: ["Discipline","⚔️"], CREATION: ["Creation","🛠️"], CAREER: ["Career","💼"], CREATIVITY: ["Creativity","🎨"], SOCIAL: ["Social","🗣️"], EXPLORATION: ["Exploration","🌎"], WELLBEING: ["Wellbeing","❤️"] };
const TEXT: Record<CategoryKey, string[]> = {
  KNOWLEDGE: ["Passed the advanced statistics exam","Completed a 6-week ML course"], FITNESS: ["Ran a half marathon","Hit a 100kg squat"],
  DISCIPLINE: ["30 days of early mornings","Stuck to the study plan all month"], CREATION: ["Shipped my side project","Built a mobile app prototype"],
  CAREER: ["Got a promotion","Landed a new job offer"], CREATIVITY: ["Finished a short film","Wrote and recorded a song"],
  SOCIAL: ["Hosted a community meetup","Mentored two juniors"], EXPLORATION: ["Trekked to base camp","Visited three new cities"], WELLBEING: ["Two months of daily meditation","Completed a therapy program"] };
//            KNW  FIT  DIS  CRE  CAR  CRV  SOC  EXP  WEL
const USERS: [string, string, number[]][] = [
  ["Adi","adi",[800,600,700,900,700,150,120,60,150]],
  ["Alex","alex",[900,300,1200,800,4200,300,600,150,300]],       // career-heavy
  ["Maya","maya",[400,4300,1500,200,300,300,500,900,800]],        // fitness-heavy
  ["Ryan","ryan",[4600,200,1100,700,600,200,200,100,300]],        // knowledge-heavy
  ["Sam","sam",[500,200,600,4400,700,1800,300,200,200]],          // creator
  ["Jordan","jordan",[1100,1000,1000,1000,1100,900,1000,900,1000]], // balanced
  ["Priya","priya",[700,500,600,600,500,2600,2200,900,900]],      // creative + social
];
async function main() {
  for (const k of K) await db.category.upsert({ where: { key: k }, create: { key: k, name: META[k][0], icon: META[k][1] }, update: {} });
  const pw = await bcrypt.hash("vita1234", 12), ids: string[] = [];
  for (const [name, handle, xps] of USERS) {
    const total = xps.reduce((a, b) => a + b, 0), level = levelFromXp(total);
    const u = await db.user.upsert({ where: { email: `${handle}@vita.dev` }, update: {}, create: {
      email: `${handle}@vita.dev`, name, passwordHash: pw,
      profile: { create: { handle, totalXp: total, level, title: titleForLevel(level), momentum: 1 + (total % 5) / 10, lastActiveOn: new Date() } },
      privacy: { create: {} } } });
    ids.push(u.id);
    for (let i = 0; i < K.length; i++) await db.userCategoryXP.upsert({ where: { userId_category: { userId: u.id, category: K[i] } },
      create: { userId: u.id, category: K[i], xp: xps[i], level: statLevel(xps[i]) }, update: {} });
    const top = K.map((k, i) => [k, xps[i]] as const).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (!(await db.achievement.count({ where: { userId: u.id } })))
      for (const [j, [cat, x]] of top.entries()) for (const [n, text] of TEXT[cat].entries()) {
        const xp = Math.round((x / 4) * (n ? 0.4 : 0.6)), when = new Date(Date.now() - (j * 4 + n * 2 + 1) * 864e5);
        const a = await db.achievement.create({ data: { userId: u.id, text, primaryCategory: cat, xpAwarded: xp, createdAt: when, occurredOn: when,
          evaluation: { create: { difficulty: 6, effort: 6, impact: 6, rarity: 5, timeInvestment: 6, llmRecommendedXp: xp, formulaXp: xp, repeatFactor: 1, momentumFactor: 1, finalXp: xp, reason: "Seeded", evaluator: "seed" } } } });
        await db.activity.create({ data: { userId: u.id, type: "ACHIEVEMENT", createdAt: when, payload: { id: a.id, text, xp, category: cat } } });
      }
  }
  for (const a of ids) for (const b of ids) if (a < b) await db.friendship.upsert({ where: { requesterId_addresseeId: { requesterId: a, addresseeId: b } }, create: { requesterId: a, addresseeId: b, status: "ACCEPTED" }, update: {} });
  if (!(await db.party.count())) {
    await db.party.create({ data: { name: "The Grinders", weeklyGoalXp: 10000, members: { create: ids.slice(0, 4).map(userId => ({ userId })) } } });
    const tot = (await db.profile.aggregate({ _sum: { totalXp: true } }))._sum.totalXp ?? 0;
    await db.guild.create({ data: { name: "Night Owls", kind: "friend group", totalXp: tot, level: levelFromXp(Math.round(tot / 5)), members: { create: ids.map((userId, i) => ({ userId, role: i ? "MEMBER" : "OWNER" })) } } });
    await db.challenge.create({ data: { kind: "FITNESS", title: "Most Fitness XP in 7 days", category: "FITNESS", xpTarget: 1500, startsAt: new Date(), endsAt: new Date(Date.now() + 7 * 864e5), participants: { create: ids.slice(0, 4).map(userId => ({ userId })) } } });
  }
  console.log("Seeded. Log in with adi@vita.dev / vita1234 (all users share this password)");
}
main().finally(() => db.$disconnect());
