import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canSee } from "@/lib/privacy";
import { statLevel } from "@/lib/game/xp";

const CATS = ["KNOWLEDGE", "FITNESS", "DISCIPLINE", "CREATION", "CAREER", "CREATIVITY", "SOCIAL", "EXPLORATION", "WELLBEING"];
const ICON: Record<string, string> = { KNOWLEDGE: "🧠", FITNESS: "💪", DISCIPLINE: "⚔️", CREATION: "🛠️", CAREER: "💼", CREATIVITY: "🎨", SOCIAL: "🗣️", EXPLORATION: "🌎", WELLBEING: "❤️" };

async function snapshot(uid: string, viewer: string) {
  const [p, seeStats, seeLevel, seeAch] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId: uid }, include: { user: true } }),
    canSee(viewer, uid, "stats"), canSee(viewer, uid, "level"), canSee(viewer, uid, "achievements")]);
  const since = (d: number) => new Date(Date.now() - d * 864e5);
  const [xs, w, m, ups, ach] = await Promise.all([
    prisma.userCategoryXP.findMany({ where: { userId: uid } }),
    prisma.achievement.aggregate({ where: { userId: uid, createdAt: { gte: since(7) } }, _sum: { xpAwarded: true } }),
    prisma.achievement.aggregate({ where: { userId: uid, createdAt: { gte: since(30) } }, _sum: { xpAwarded: true } }),
    prisma.activity.count({ where: { userId: uid, type: "LEVEL_UP" } }),
    prisma.achievement.count({ where: { userId: uid } })]);
  const stat = Object.fromEntries(xs.map(x => [x.category, statLevel(x.xp)]));
  return { name: p.user.name, handle: p.handle, level: seeLevel ? p.level : null, total: seeLevel ? p.totalXp : null,
    stat: seeStats ? stat : null, week: seeLevel ? w._sum.xpAwarded ?? 0 : null, month: seeLevel ? m._sum.xpAwarded ?? 0 : null,
    levelsGained: seeLevel ? ups : null, ach: seeAch ? ach : null };
}

export default async function Compare({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const uid = (await auth())!.user.id, q = (await searchParams).with;
  const fr = await prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: uid }, { addresseeId: uid }] },
    include: { requester: { include: { profile: true } }, addressee: { include: { profile: true } } } });
  const friends = fr.map(f => (f.requesterId === uid ? f.addressee : f.requester));
  const other = friends.find(f => f.profile?.handle === q);
  const [a, b] = other ? await Promise.all([snapshot(uid, uid), snapshot(other.id, uid)]) : [null, null];
  const v = (x: number | null | undefined) => (x == null ? "🔒" : x.toLocaleString());
  const Row = ({ l, x, y }: { l: string; x?: number | null; y?: number | null }) => {
    const max = Math.max(x ?? 0, y ?? 0, 1);
    return (<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-zinc-800 py-2 text-sm">
      <div className="flex items-center justify-end gap-2"><span>{v(x)}</span><div className="h-1.5 w-full max-w-[120px] rounded-full bg-zinc-800"><div className="ml-auto h-full rounded-full bg-amber-400" style={{ width: `${((x ?? 0) / max) * 100}%` }} /></div></div>
      <span className="w-24 text-center text-xs uppercase tracking-widest text-zinc-500">{l}</span>
      <div className="flex items-center gap-2"><div className="h-1.5 w-full max-w-[120px] rounded-full bg-zinc-800"><div className="h-full rounded-full bg-zinc-300" style={{ width: `${((y ?? 0) / max) * 100}%` }} /></div><span>{v(y)}</span></div></div>);
  };
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <h1 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Compare</h1>
      <div className="mb-6 flex flex-wrap gap-2">{friends.map(f => <Link key={f.id} href={`/compare?with=${f.profile?.handle}`}
        className={`rounded-full border px-4 py-1 text-sm ${f.profile?.handle === q ? "border-amber-400 text-amber-400" : "border-zinc-800 text-zinc-400"}`}>{f.name}</Link>)}</div>
      {a && b ? (<section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] text-center text-lg font-extrabold"><span>{a.name}</span><span className="w-24" /><span>{b.name}</span></div>
        <Row l="Level" x={a.level} y={b.level} /><Row l="Total XP" x={a.total} y={b.total} /><Row l="Week XP" x={a.week} y={b.week} />
        <Row l="Month XP" x={a.month} y={b.month} /><Row l="Levels gained" x={a.levelsGained} y={b.levelsGained} /><Row l="Achievements" x={a.ach} y={b.ach} />
        <div className="mt-4 text-[11px] uppercase tracking-[.2em] text-zinc-500">Character build</div>
        {CATS.map(c => <Row key={c} l={`${ICON[c]} ${c[0] + c.slice(1, 5).toLowerCase()}`} x={a.stat ? a.stat[c] ?? 1 : null} y={b.stat ? b.stat[c] ?? 1 : null} />)}
      </section>) : <p className="text-zinc-500">Pick a friend to compare builds. There is no winner here, only different characters.</p>}
    </main>);
}
