import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CATS = ["KNOWLEDGE", "FITNESS", "DISCIPLINE", "CREATION", "CAREER", "CREATIVITY", "SOCIAL", "EXPLORATION", "WELLBEING"] as const;
const KINDS = ["FITNESS", "LEARNING", "CREATOR", "PARTY", "CUSTOM"] as const;
const inp = "w-full rounded-lg border border-zinc-800 bg-black/40 p-2 text-sm";

async function friendsOf(uid: string) {
  const fr = await prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: uid }, { addresseeId: uid }] },
    include: { requester: true, addressee: true } });
  return fr.map(f => (f.requesterId === uid ? f.addressee : f.requester));
}

export default async function Challenges() {
  const uid = (await auth())!.user.id, friends = await friendsOf(uid);
  async function create(fd: FormData) {
    "use server";
    const me = (await auth())!.user.id, mine = await friendsOf(me);
    const p = z.object({ title: z.string().trim().min(3).max(80), kind: z.enum(KINDS), xpTarget: z.coerce.number().int().min(100).max(50000), days: z.coerce.number().int().min(1).max(30) })
      .safeParse({ title: fd.get("title"), kind: fd.get("kind"), xpTarget: fd.get("xpTarget"), days: fd.get("days") });
    if (!p.success) return;
    const cat = CATS.find(c => c === fd.get("category"));
    const invited = fd.getAll("friends").map(String).filter(id => mine.some(f => f.id === id)); // friends only
    await prisma.challenge.create({ data: { title: p.data.title, kind: p.data.kind, category: cat ?? null, xpTarget: p.data.xpTarget,
      startsAt: new Date(), endsAt: new Date(Date.now() + p.data.days * 864e5),
      participants: { create: [me, ...invited].map(userId => ({ userId })) } } });
    revalidatePath("/challenges");
  }
  const list = await prisma.challenge.findMany({ where: { participants: { some: { userId: uid } } }, orderBy: { endsAt: "desc" }, take: 12,
    include: { participants: { orderBy: { progressXp: "desc" }, include: { user: { select: { name: true } } } } } });
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <h1 className="mb-4 text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Challenges</h1>
      {list.map(c => { const left = Math.max(0, Math.ceil((+c.endsAt - Date.now()) / 864e5)), done = !!c.completedAt || left === 0;
        return (<section key={c.id} className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex justify-between"><b>{c.title}</b><span className={`text-xs ${done ? "text-zinc-500" : "text-amber-400"}`}>{c.completedAt ? "COMPLETE" : done ? "ENDED" : `${left}d left`}</span></div>
          <div className="mb-3 text-xs text-zinc-500">{c.kind}{c.category ? ` · ${c.category} XP` : ""} · target {c.xpTarget?.toLocaleString()} XP{c.kind === "PARTY" ? " combined" : ""}</div>
          {c.participants.map((p, i) => (<div key={p.userId} className="my-2 text-sm"><div className="flex justify-between"><span>{i + 1}. {p.user.name}</span><span className="text-zinc-500">{p.progressXp.toLocaleString()}</span></div>
            <div className="h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (p.progressXp / (c.xpTarget ?? 1)) * 100)}%` }} /></div></div>))}
        </section>); })}
      <form action={create} className="space-y-3 rounded-2xl border border-zinc-800 p-5">
        <div className="text-[11px] uppercase tracking-[.2em] text-zinc-500">New challenge</div>
        <input name="title" placeholder="Earn the most Fitness XP in 7 days" className={inp} required />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <select name="kind" className={inp}>{KINDS.map(k => <option key={k}>{k}</option>)}</select>
          <select name="category" className={inp}><option value="">Any category</option>{CATS.map(k => <option key={k}>{k}</option>)}</select>
          <input name="xpTarget" type="number" defaultValue={1500} className={inp} /><input name="days" type="number" defaultValue={7} className={inp} /></div>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-400">{friends.map(f => <label key={f.id}><input type="checkbox" name="friends" value={f.id} /> {f.name}</label>)}</div>
        <button className="rounded-lg bg-amber-400 px-5 py-2 font-bold text-black">Start challenge</button>
      </form>
    </main>);
}
