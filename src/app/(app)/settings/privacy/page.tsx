import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const FIELDS = [["level", "Level and XP"], ["stats", "Stats"], ["achievements", "Achievements and badges"], ["quests", "Active quests"], ["momentum", "Momentum"], ["activity", "Recent activity (feed)"]] as const;
const VIS = ["PRIVATE", "FRIENDS", "PUBLIC"] as const;

export default async function PrivacySettings() {
  const uid = (await auth())!.user.id;
  const cur = await prisma.userPrivacySettings.findUnique({ where: { userId: uid } });
  async function save(fd: FormData) {
    "use server";
    const me = (await auth())!.user.id;
    const shape = Object.fromEntries(FIELDS.map(([k]) => [k, z.enum(VIS)]));
    const p = z.object(shape).safeParse(Object.fromEntries(FIELDS.map(([k]) => [k, fd.get(k)])));
    if (!p.success) return;
    await prisma.userPrivacySettings.upsert({ where: { userId: me }, create: { userId: me, ...p.data }, update: p.data });
    revalidatePath("/settings/privacy");
  }
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <h1 className="mb-1 text-[11px] uppercase tracking-[.2em] text-zinc-500">Privacy</h1>
      <p className="mb-4 text-sm text-zinc-500">Choose who can see each part of your VITA character.</p>
      <form action={save} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        {FIELDS.map(([k, label]) => (
          <label key={k} className="flex items-center justify-between text-sm">{label}
            <select name={k} defaultValue={(cur as any)?.[k] ?? "FRIENDS"} className="rounded-lg border border-zinc-800 bg-black/40 p-2 text-xs">
              {VIS.map(v => <option key={v} value={v}>{v[0] + v.slice(1).toLowerCase()}</option>)}</select></label>))}
        <button className="rounded-lg bg-amber-400 px-5 py-2 font-bold text-black">Save</button>
      </form>
    </main>);
}
