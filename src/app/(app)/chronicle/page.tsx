import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nearestMilestone, statTitle, weeklyRecap } from "@/lib/game/master";
import { titleForLevel } from "@/lib/game/xp";
import { GAME } from "@/lib/game/config";

const ICON: Record<string, string> = { KNOWLEDGE: "🧠", FITNESS: "💪", DISCIPLINE: "⚔️", CREATION: "🛠️", CAREER: "💼", CREATIVITY: "🎨", SOCIAL: "🗣️", EXPLORATION: "🌎", WELLBEING: "❤️" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function Chronicle() {
  const uid = (await auth())!.user.id, now = new Date(), year = now.getFullYear();
  const [me, stats, all, ups, questsDone] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId: uid } }),
    prisma.userCategoryXP.findMany({ where: { userId: uid } }),
    prisma.achievement.findMany({ where: { userId: uid, createdAt: { gte: new Date(year, 0, 1) } }, select: { text: true, xpAwarded: true, primaryCategory: true, createdAt: true } }),
    prisma.activity.count({ where: { userId: uid, type: "LEVEL_UP", createdAt: { gte: new Date(year, 0, 1) } } }),
    prisma.quest.count({ where: { ownerId: uid, completedAt: { gte: new Date(year, 0, 1) } } })]);
  const grid = (cat?: string) => MONTHS.map((_, m) => all.filter(a => a.createdAt.getMonth() === m && (!cat || a.primaryCategory === cat)).reduce((s, a) => s + a.xpAwarded, 0));
  const byCat: Record<string, number> = {}; all.forEach(a => (byCat[a.primaryCategory] = (byCat[a.primaryCategory] ?? 0) + a.xpAwarded));
  const top3 = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  const rows: [string, number[]][] = [["XP", grid()], ...top3.map(c => [`${ICON[c]} ${c[0] + c.slice(1).toLowerCase()}`, grid(c)] as [string, number[]])];
  const wk = (from: number, to: number) => all.filter(a => +a.createdAt >= Date.now() - from * 864e5 && +a.createdAt < Date.now() - to * 864e5);
  const thisWeek = wk(7, 0).map(a => ({ text: a.text, xp: a.xpAwarded, cat: a.primaryCategory }));
  const prev: Record<string, number> = {}; wk(14, 7).forEach(a => (prev[a.primaryCategory] = (prev[a.primaryCategory] ?? 0) + a.xpAwarded));
  const recap = weeklyRecap(thisWeek, me.momentum, prev), ms = nearestMilestone(stats);
  const dom = [...stats].sort((a, b) => b.xp - a.xp)[0]?.category;
  const titles = [...new Set([...GAME.titles.filter(([l]) => me.level >= l).map(t => t[1]), ...(dom ? [statTitle(dom)] : [])])];
  const suggestCat = recap.top ?? dom, suggestTarget = Math.max(200, Math.round(((prev[suggestCat ?? ""] ?? 0) * 1.3) / 50) * 50);
  async function equip(fd: FormData) {
    "use server";
    const u = (await auth())!.user.id, t = String(fd.get("t")), p = await prisma.profile.findUniqueOrThrow({ where: { userId: u } });
    const d = await prisma.userCategoryXP.findFirst({ where: { userId: u }, orderBy: { xp: "desc" } });
    const ok = [...GAME.titles.filter(([l]) => p.level >= l).map(x => x[1]), ...(d ? [statTitle(d.category)] : [])]; // server re-validates
    if (ok.includes(t as any)) await prisma.profile.update({ where: { userId: u }, data: { title: t } });
    revalidatePath("/chronicle");
  }
  async function challengeMe() {
    "use server";
    const u = (await auth())!.user.id;
    if (!suggestCat) return;
    await prisma.challenge.create({ data: { kind: "CUSTOM", title: `Beat last week: ${suggestTarget} ${suggestCat.toLowerCase()} XP`, category: suggestCat as any, xpTarget: suggestTarget,
      startsAt: new Date(), endsAt: new Date(Date.now() + 7 * 864e5), participants: { create: { userId: u } } } });
    revalidatePath("/challenges");
  }
  const big = [...all].sort((a, b) => b.xpAwarded - a.xpAwarded).slice(0, 5), total = all.reduce((s, a) => s + a.xpAwarded, 0);
  const Spark = ({ v }: { v: number[] }) => { const mx = Math.max(...v, 1); return <div className="flex h-10 items-end gap-1">{v.map((x, i) => <div key={i} title={`${MONTHS[i]}: ${x.toLocaleString()} XP`} className={`flex-1 rounded-sm ${i > now.getMonth() ? "bg-zinc-900" : "bg-amber-400"}`} style={{ height: `${Math.max(x ? 8 : 3, (x / mx) * 100)}%`, opacity: x ? 1 : 0.25 }} />)}</div>; };
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6">
        <div className="text-[11px] uppercase tracking-[.2em] text-zinc-500">This week · Game Master recap</div>
        {recap.lines.map((l, i) => <p key={i} className="mt-2 text-sm text-zinc-300">{l}</p>)}
        {ms && <p className="mt-3 text-sm text-amber-400">You're {ms.away.toLocaleString()} XP away from {ms.category[0] + ms.category.slice(1).toLowerCase()} Level {ms.level}.</p>}
        {suggestCat && <form action={challengeMe} className="mt-4"><button className="rounded-lg border border-amber-400 px-4 py-2 text-sm text-amber-400">Accept suggested challenge: {suggestTarget} {suggestCat.toLowerCase()} XP this week</button></form>}
      </section>
      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h1 className="mb-1 text-[11px] uppercase tracking-[.2em] text-zinc-500">Your VITA Chronicle · {year}</h1>
        <div className="mb-4 text-sm text-zinc-400">{total.toLocaleString()} XP · {all.length} achievements · {ups} level-ups · {questsDone} quests completed</div>
        {rows.map(([l, v]) => <div key={l} className="mb-3"><div className="mb-1 text-xs text-zinc-500">{l}</div><Spark v={v} /></div>)}
        <div className="flex justify-between text-[10px] text-zinc-600">{MONTHS.map(m => <span key={m}>{m}</span>)}</div>
      </section>
      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Biggest moments</h2>
        {big.map((a, i) => <div key={i} className="flex justify-between gap-3 border-t border-zinc-800 py-2 text-sm first:border-0"><span>{ICON[a.primaryCategory]} {a.text}</span><span className="whitespace-nowrap text-amber-400">+{a.xpAwarded.toLocaleString()}</span></div>)}
      </section>
      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Titles unlocked</h2>
        <div className="flex flex-wrap gap-2">{titles.map(t => <form key={t} action={equip}><input type="hidden" name="t" value={t} />
          <button className={`rounded-full border px-4 py-1 text-sm ${me.title === t ? "border-amber-400 text-amber-400" : "border-zinc-800 text-zinc-400"}`}>{t}</button></form>)}</div>
      </section>
    </main>);
}
