import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAchievement, rateLimited } from "@/lib/game/log";
import { generateQuest } from "@/lib/game/master";

export default async function Quests() {
  const uid = (await auth())!.user.id;
  async function create(fd: FormData) {
    "use server";
    const me = (await auth())!.user.id, g = z.string().trim().min(4).max(200).safeParse(fd.get("goal"));
    if (!g.success || rateLimited(me) || (await prisma.quest.count({ where: { ownerId: me, completedAt: null } })) >= 5) return;
    const plan = await generateQuest(g.data);
    await prisma.quest.create({ data: { ownerId: me, kind: "PERSONAL", title: plan.title, goal: g.data, aiGenerated: true,
      steps: { create: plan.steps.map((s, position) => ({ ...s, position })) } } });
    revalidatePath("/quests");
  }
  async function complete(fd: FormData) {
    "use server";
    const me = (await auth())!.user.id, id = String(fd.get("id"));
    const step = await prisma.questStep.findFirst({ where: { id, doneAt: null, quest: { ownerId: me } }, include: { quest: { include: { steps: true } } } });
    if (!step || rateLimited(me)) return;
    if (step.isFinal && step.quest.steps.some(s => !s.isFinal && !s.doneAt)) return; // final step unlocks last
    // claim atomically, then let the EVALUATOR decide the XP. The step's listed reward is only a hint.
    if (!(await prisma.questStep.updateMany({ where: { id, doneAt: null }, data: { doneAt: new Date() } })).count) return;
    await logAchievement(me, `${step.title} (quest: ${step.quest.title})`);
    if (!(await prisma.questStep.count({ where: { questId: step.questId, doneAt: null } })))
      await prisma.quest.update({ where: { id: step.questId }, data: { completedAt: new Date() } });
    revalidatePath("/quests"); revalidatePath("/");
  }
  const quests = await prisma.quest.findMany({ where: { ownerId: uid }, orderBy: { completedAt: { sort: "asc", nulls: "first" } }, take: 10, include: { steps: { orderBy: { position: "asc" } } } });
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <h1 className="mb-4 text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Quests</h1>
      <form action={create} className="mb-6 flex gap-2"><input name="goal" placeholder="Prepare for my GMAT" className="flex-1 rounded-lg border border-zinc-800 bg-black/40 p-3 text-sm" required />
        <button className="rounded-lg bg-amber-400 px-5 font-bold text-black">Forge quest</button></form>
      {quests.map(q => { const next = q.steps.find(s => !s.doneAt && (!s.isFinal || q.steps.every(x => x.isFinal || x.doneAt)));
        return (<section key={q.id} className={`mb-4 rounded-2xl border p-5 ${q.completedAt ? "border-zinc-800 opacity-60" : "border-zinc-800 bg-zinc-900/60"}`}>
          <div className="mb-3 font-extrabold tracking-wide">⚔️ {q.title.toUpperCase()}</div>
          {q.steps.map(s => (<div key={s.id} className="flex items-center justify-between border-t border-zinc-800 py-2 text-sm first:border-0">
            <span className={s.doneAt ? "text-zinc-500 line-through" : ""}>{s.doneAt ? "●" : s.isFinal ? "◆" : "○"} {s.title}</span>
            <span className="flex items-center gap-3"><span className="text-amber-400">+{s.xpReward.toLocaleString()}</span>
              {next?.id === s.id && <form action={complete}><input type="hidden" name="id" value={s.id} /><button className="rounded-md border border-amber-400 px-2 py-0.5 text-xs text-amber-400">Done</button></form>}</span></div>))}
          <p className="mt-2 text-[11px] text-zinc-600">Listed XP is a target. Actual XP is decided by the Game Master when you complete a step.</p></section>); })}
    </main>);
}
