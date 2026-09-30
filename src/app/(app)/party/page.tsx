import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function PartyPage() {
  const uid = (await auth())!.user.id;
  const mem = await prisma.partyMember.findFirst({ where: { userId: uid }, include: { party: { include: { members: { include: { user: { include: { profile: true } } } } } } } });
  async function create(fd: FormData) {
    "use server";
    const me = (await auth())!.user.id;
    const name = z.string().trim().min(2).max(40).safeParse(fd.get("name"));
    if (!name.success || (await prisma.partyMember.count({ where: { userId: me } }))) return;
    const fr = await prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: me }, { addresseeId: me }] } });
    const ok = new Set(fr.map(f => (f.requesterId === me ? f.addresseeId : f.requesterId)));
    const ids = fd.getAll("friends").map(String).filter(i => ok.has(i)).slice(0, 5);
    await prisma.party.create({ data: { name: name.data, members: { create: [me, ...ids].map(userId => ({ userId })) } } });
    revalidatePath("/party");
  }
  if (!mem) {
    const fr = await prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: uid }, { addresseeId: uid }] }, include: { requester: true, addressee: true } });
    return (<main className="mx-auto min-h-screen max-w-md bg-[#0c0c0e] p-4 pt-14 text-zinc-100">
      <h1 className="mb-4 text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Party</h1>
      <form action={create} className="space-y-3 rounded-2xl border border-zinc-800 p-5"><input name="name" placeholder="THE GRINDERS" className="w-full rounded-lg border border-zinc-800 bg-black/40 p-2" required />
        <div className="space-y-1 text-sm text-zinc-400">{fr.map(f => { const o = f.requesterId === uid ? f.addressee : f.requester; return <label key={o.id} className="block"><input type="checkbox" name="friends" value={o.id} /> {o.name}</label>; })}</div>
        <button className="rounded-lg bg-amber-400 px-5 py-2 font-bold text-black">Form party (max 6)</button></form></main>);
  }
  const party = mem.party, ids = party.members.map(m => m.userId);
  const week = (await prisma.achievement.aggregate({ where: { userId: { in: ids }, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } }, _sum: { xpAwarded: true } }))._sum.xpAwarded ?? 0;
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8">
        <div className="text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Party</div>
        <div className="text-3xl font-extrabold">{party.name.toUpperCase()}</div>
        <div className="mt-5 text-xs uppercase tracking-[.2em] text-zinc-500">Party XP this week</div>
        <div className="text-4xl font-extrabold text-amber-400">{week.toLocaleString()} <span className="text-lg text-zinc-500">/ {party.weeklyGoalXp.toLocaleString()}</span></div>
        <div className="mt-2 h-2 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (week / party.weeklyGoalXp) * 100)}%` }} /></div>
        <p className="mt-3 text-sm text-zinc-400">Current quest: earn {party.weeklyGoalXp.toLocaleString()} combined XP this week.{week >= party.weeklyGoalXp && " ✅ Quest complete!"}</p>
      </section>
      <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        {party.members.map(m => (<div key={m.userId} className="flex justify-between border-t border-zinc-800 py-2 text-sm first:border-0"><span>{m.user.name}</span><span className="text-amber-400">LV. {m.user.profile?.level}</span></div>))}
      </section>
    </main>);
}
