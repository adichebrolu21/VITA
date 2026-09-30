import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ReactionBar from "@/components/ReactionBar";
import { revalidatePath } from "next/cache";

export default async function Feed() {
  const uid = (await auth())!.user.id;
  const fr = await prisma.friendship.findMany({ where: { OR: [{ requesterId: uid }, { addresseeId: uid }] },
    include: { requester: { select: { id: true, name: true } } } });
  const friendIds = fr.filter(f => f.status === "ACCEPTED").map(f => (f.requesterId === uid ? f.addresseeId : f.requesterId));
  const hidden = (await prisma.userPrivacySettings.findMany({ where: { userId: { in: friendIds }, activity: "PRIVATE" }, select: { userId: true } })).map(x => x.userId);
  const pending = fr.filter(f => f.status === "PENDING" && f.addresseeId === uid);
  const items = await prisma.activity.findMany({ where: { userId: { in: [uid, ...friendIds.filter(i => !hidden.includes(i))] } },
    orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } }, reactions: true } });
  const line = (a: (typeof items)[number]) => {
    const p = a.payload as any;
    if (a.type === "BADGE") return <>{p.icon} unlocked <b>{p.name}</b></>;
    if (a.type === "LEVEL_UP") return <>🎉 reached <b>Level {p.to}</b></>;
    return <>⚔️ completed <b>{p.text}</b> <span className="text-amber-400">+{Number(p.xp).toLocaleString()} XP</span></>;
  };
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <h1 className="mb-4 text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Feed</h1>
      {pending.map(f => (
        <form key={f.id} className="mb-3 flex items-center justify-between rounded-xl border border-amber-400/40 p-3 text-sm"
          action={async () => { "use server"; await prisma.friendship.updateMany({ where: { id: f.id, addresseeId: uid }, data: { status: "ACCEPTED" } }); revalidatePath("/feed"); }}>
          <span>{f.requester.name} sent a friend request</span><button className="rounded-lg bg-amber-400 px-3 py-1 font-bold text-black">Accept</button></form>))}
      {items.map(a => {
        const counts: Record<string, number> = {}; a.reactions.forEach(r => (counts[r.emoji] = (counts[r.emoji] ?? 0) + 1));
        return (<article key={a.id} className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm">
          <div><b>{a.user.name}</b> {line(a)}</div><div className="text-xs text-zinc-600">{a.createdAt.toLocaleDateString()}</div>
          <ReactionBar activityId={a.id} counts={counts} mine={a.reactions.filter(r => r.userId === uid).map(r => r.emoji)} /></article>);
      })}
      {!items.length && <p className="text-zinc-500">Nothing yet. Log an achievement or add friends.</p>}
    </main>);
}
