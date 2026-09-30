import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
const B = z.object({ name: z.string().trim().min(2).max(40), email: z.string().email(), password: z.string().min(8).max(100) });
export async function POST(req: Request) {
  const p = B.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const email = p.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Email in use" }, { status: 409 });
  const handle = p.data.name.toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 999);
  await prisma.user.create({ data: { email, name: p.data.name, passwordHash: await bcrypt.hash(p.data.password, 12),
    profile: { create: { handle } }, privacy: { create: {} } } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
