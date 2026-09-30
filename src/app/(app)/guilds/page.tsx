import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
const KINDS = ["college", "workplace", "gaming group", "coding group", "friend group", "sports group"];

export default async function Guilds() {
  const uid = (await auth())!.user.id;
  const guilds = await prisma.guild.findMany({ orderBy: { totalXp: "desc" }, take: 20, include: { members: { select: { userId: true } } } });
  async function create(fd: FormData) {
    "use server";
    const me = (await auth())!.user.id;
    const p = z.object({ name: z.string().trim().min(3).max(40), kind: z.enum(KINDS as [string, ...string[]]) }).safeParse({ name: fd.get("name"), kind: fd.get("kind") });
    if (!p.success) return;
    try { await prisma.guild.create({ data: { ...p.data, members: { create: { userId: me, role: "OWNER" } } } }); } catch { /* name taken */ }
    revalidatePath("/guilds");
  }
  async function join(fd: FormData) {
    "use server";
    const me = (await auth())!.user.id, id = String(fd.get("id"));
    await prisma.guildMember.upsert({ where: { guildId_userId: { guildId: id, userId: me } }, create: { guildId: id, userId: me }, update: {} });
    revalidatePath("/guilds");
  }
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <h1 className="mb-4 text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Guilds</h1>
      {guilds.map(g => { const joined = g.members.some(m => m.userId === uid);
        return (<section key={g.id} className={`mb-3 flex items-center justify-between rounded-2xl border p-4 ${joined ? "border-amber-400/40" : "border-zinc-800"} bg-zinc-900/60`}>
          <div><b>{g.name}</b> <span className="text-xs text-zinc-500">· {g.kind}</span><div className="text-xs text-zinc-500">{g.members.length} members · {g.totalXp.toLocaleString()} guild XP</div></div>
          <div className="text-right"><div className="text-xl font-extrabold text-amber-400">LV. {g.level}</div>
            {!joined && <form action={join}><input type="hidden" name="id" value={g.id} /><button className="text-xs text-zinc-400 underline">Join</button></form>}</div></section>); })}
      <form action={create} className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 p-4">
        <input name="name" placeholder="Guild name" className="flex-1 rounded-lg border border-zinc-800 bg-black/40 p-2 text-sm" required />
        <select name="kind" className="rounded-lg border border-zinc-800 bg-black/40 p-2 text-sm">{KINDS.map(k => <option key={k}>{k}</option>)}</select>
        <button className="rounded-lg bg-amber-400 px-5 py-2 font-bold text-black">Create</button></form>
    </main>);
}
