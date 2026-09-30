import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { areFriends, canSee } from "@/lib/privacy";
import { statLevel } from "@/lib/game/xp";

const ICON: Record<string, string> = { KNOWLEDGE: "🧠", FITNESS: "💪", DISCIPLINE: "⚔️", CREATION: "🛠️", CAREER: "💼", CREATIVITY: "🎨", SOCIAL: "🗣️", EXPLORATION: "🌎", WELLBEING: "❤️" };

export default async function Profile({ params }: { params: Promise<{ handle: string }> }) {
  const uid = (await auth())!.user.id, { handle } = await params;
  const p = await prisma.profile.findUnique({ where: { handle }, include: { user: true } });
  if (!p) notFound();
  const [lv, st, ac, mo] = await Promise.all(["level", "stats", "achievements", "momentum"].map(f => canSee(uid, p.userId, f as any)));
  const [stats, ach, friend, existing] = await Promise.all([
    st ? prisma.userCategoryXP.findMany({ where: { userId: p.userId }, orderBy: { xp: "desc" } }) : [],
    ac ? prisma.achievement.findMany({ where: { userId: p.userId }, orderBy: { xpAwarded: "desc" }, take: 5 }) : [],
    areFriends(uid, p.userId),
    prisma.friendship.findFirst({ where: { OR: [{ requesterId: uid, addresseeId: p.userId }, { requesterId: p.userId, addresseeId: uid }] } })]);
  const badges = ac ? await prisma.userBadge.findMany({ where: { userId: p.userId }, include: { badge: true } }) : [];
  const lock = <span className="text-zinc-600">🔒 Private</span>;
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 text-center">
        <div className="text-sm tracking-[.3em] text-zinc-400">{p.user.name.toUpperCase()}</div>
        <div className="mt-1 text-5xl font-extrabold">{lv ? <>LEVEL <span className="text-amber-400">{p.level}</span></> : lock}</div>
        {lv && <div className="mt-1 text-xs uppercase tracking-[.2em] text-amber-400">{p.title}</div>}
        <div className="mt-2 text-sm text-zinc-500">{lv ? `${p.totalXp.toLocaleString()} XP` : ""}{mo && lv ? ` · 🔥 ×${p.momentum.toFixed(2)}` : ""}</div>
        {uid !== p.userId && !friend && !existing && (
          <form className="mt-4" action={async () => { "use server"; await prisma.friendship.create({ data: { requesterId: uid, addresseeId: p.userId } }); revalidatePath(`/u/${handle}`); }}>
            <button className="rounded-lg bg-amber-400 px-5 py-2 font-bold text-black">Add friend</button></form>)}
        {uid === p.userId && <a href="/settings/privacy" className="mt-4 inline-block text-xs text-zinc-500 underline">Privacy settings</a>}
        {existing?.status === "PENDING" && <p className="mt-4 text-xs text-zinc-500">Friend request pending</p>}
      </section>
      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Stats</h2>
        {st ? stats.map(x => <div key={x.category} className="flex justify-between py-1 text-sm"><span>{ICON[x.category]} {x.category[0] + x.category.slice(1).toLowerCase()}</span><span className="text-zinc-500">LV. {statLevel(x.xp)}</span></div>) : lock}
      </section>
      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Biggest achievements</h2>
        {ac ? ach.map(a => <div key={a.id} className="flex justify-between gap-3 border-t border-zinc-800 py-2 text-sm first:border-0"><span>{ICON[a.primaryCategory]} {a.text}</span><span className="whitespace-nowrap text-amber-400">+{a.xpAwarded.toLocaleString()}</span></div>) : lock}
      </section>
      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Badges</h2>
        {ac ? (badges.length ? <div className="flex flex-wrap gap-2">{badges.map(b => <span key={b.badgeId} title={b.badge.description} className={`rounded-full border px-3 py-1 text-sm ${b.badge.rarity === "LEGENDARY" ? "border-amber-400 text-amber-400" : b.badge.rarity === "RARE" ? "border-zinc-500" : "border-zinc-800 text-zinc-400"}`}>{b.badge.icon} {b.badge.name}</span>)}</div> : <span className="text-sm text-zinc-600">None yet</span>) : lock}
      </section>
    </main>);
}
