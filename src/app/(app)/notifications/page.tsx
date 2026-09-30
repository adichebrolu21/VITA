import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export default async function Notifications() {
  const uid = (await auth())!.user.id;
  const list = await prisma.notification.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" }, take: 30 });
  async function readAll() { "use server"; const u = (await auth())!.user.id; await prisma.notification.updateMany({ where: { userId: u, readAt: null }, data: { readAt: new Date() } }); revalidatePath("/notifications"); revalidatePath("/"); }
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-[#0c0c0e] p-4 pb-28 pt-14 text-zinc-100">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-[11px] uppercase tracking-[.2em] text-zinc-500">Notifications</h1>
        <form action={readAll}><button className="text-xs text-zinc-500 underline">Mark all read</button></form></div>
      {list.map(n => <div key={n.id} className={`mb-2 rounded-xl border p-3 text-sm ${n.readAt ? "border-zinc-800 text-zinc-500" : "border-amber-400/40"}`}>{n.body}<div className="text-[11px] text-zinc-600">{n.createdAt.toLocaleString()}</div></div>)}
      {!list.length && <p className="text-zinc-500">Nothing yet.</p>}
    </main>);
}
