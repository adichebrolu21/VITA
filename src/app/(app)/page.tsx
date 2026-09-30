import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { xpForLevel, statLevel } from "@/lib/game/xp";
import LogAchievement from "@/components/LogAchievement";

const ICON: Record<string, string> = { KNOWLEDGE: "🧠", FITNESS: "💪", DISCIPLINE: "⚔️", CREATION: "🛠️", CAREER: "💼", CREATIVITY: "🎨", SOCIAL: "🗣️", EXPLORATION: "🌎", WELLBEING: "❤️" };

export default async function Home() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  const uid = s.user.id;
  const [me, stats, recent, friends] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId: uid }, include: { user: true } }),
    prisma.userCategoryXP.findMany({ where: { userId: uid }, orderBy: { category: "asc" } }),
    prisma.achievement.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: uid }, { addresseeId: uid }] }, take: 6,
      include: { requester: { include: { profile: true } }, addressee: { include: { profile: true } } } }),
  ]);
  const unread = await prisma.notification.count({ where: { userId: uid, readAt: null } });
  const lo = xpForLevel(me.level), hi = xpForLevel(me.level + 1), pct = ((me.totalXp - lo) / (hi - lo)) * 100;
  return (
    <main className="min-h-screen bg-[#0c0c0e] text-zinc-100 pb-28">
      <div className="mx-auto max-w-4xl p-4">
        <header className="flex justify-between py-2 mb-4"><b className="tracking-[.35em]">VITA</b><span className="flex items-center gap-4 text-xs tracking-widest text-zinc-500"><a href="/notifications" title="Notifications">🔔{unread ? ` ${unread}` : ""}</a>{me.user.name.toUpperCase()}</span></header>
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 text-center">
          <div className="text-6xl font-extrabold">LEVEL <span className="text-amber-400">{me.level}</span></div>
          <div className="mt-1 text-xs uppercase tracking-[.2em] text-amber-400">{me.title}</div>
          <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
          <div className="mx-auto mt-2 flex max-w-md justify-between text-xs text-zinc-500"><span>{me.totalXp.toLocaleString()} XP</span><span>{(hi - me.totalXp).toLocaleString()} to next</span></div>
          <div className="mt-4 inline-block rounded-full border border-zinc-800 px-3 py-1 text-xs text-amber-400">🔥 MOMENTUM ×{me.momentum.toFixed(2)}</div>
        </section>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:col-span-2">
            <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Stats</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
              {stats.map(x => <div key={x.category} className="flex justify-between text-sm"><span>{ICON[x.category]} {x.category[0] + x.category.slice(1).toLowerCase()}</span><span className="text-zinc-500">LV. {statLevel(x.xp)}</span></div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Friends</h2>
            {friends.map(f => { const o = f.requesterId === uid ? f.addressee : f.requester;
              return <div key={f.id} className="flex justify-between border-t border-zinc-800 py-2 text-sm first:border-0"><span>{o.name}</span><span className="text-amber-400">Lv.{o.profile?.level}</span></div>; })}
          </section>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Recent achievements</h2>
            {recent.map(a => <div key={a.id} className="flex justify-between gap-3 border-t border-zinc-800 py-2 text-sm first:border-0"><span>{ICON[a.primaryCategory]} {a.text}</span><span className="whitespace-nowrap text-amber-400">+{a.xpAwarded.toLocaleString()} XP</span></div>)}
          </section>
        </div>
      </div>
      <LogAchievement />
    </main>
  );
}
