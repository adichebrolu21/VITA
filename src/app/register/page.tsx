import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function Register({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const e = (await searchParams).e;
  async function create(fd: FormData) {
    "use server";
    const p = z.object({ name: z.string().trim().min(2).max(40), email: z.string().email(), password: z.string().min(8).max(100) })
      .safeParse({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") });
    if (!p.success) redirect("/register?e=invalid");
    const email = p.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) redirect("/register?e=taken");
    const handle = p.data.name.toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 999);
    await prisma.user.create({ data: { email, name: p.data.name, passwordHash: await bcrypt.hash(p.data.password, 12), profile: { create: { handle } }, privacy: { create: {} } } });
    await signIn("credentials", { email, password: p.data.password, redirectTo: "/" });
  }
  const c = "w-full rounded-lg bg-black/40 border border-zinc-800 p-3";
  return (
    <main className="min-h-screen grid place-items-center bg-[#0c0c0e] text-zinc-100 p-6">
      <form action={create} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
        <h1 className="text-center text-xl font-extrabold tracking-[.35em]">VITA</h1>
        <p className="text-center text-xs text-zinc-500">Create your character</p>
        <input name="name" placeholder="Character name" className={c} required />
        <input name="email" type="email" placeholder="Email" className={c} required />
        <input name="password" type="password" placeholder="Password (8+ characters)" className={c} required />
        {e && <p className="text-sm text-red-400">{e === "taken" ? "That email is already registered." : "Check your details and try again."}</p>}
        <button className="w-full rounded-lg bg-amber-400 py-3 font-bold text-black">BEGIN</button>
        <a href="/login" className="block text-center text-xs text-zinc-500 underline">Already have a character?</a>
      </form>
    </main>);
}
