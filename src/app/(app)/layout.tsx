import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  const me = await prisma.profile.findUnique({ where: { userId: s.user.id }, select: { handle: true } });
  const all = [["/", "Home", "🏠"], ["/feed", "Feed", "⚡"], ["/quests", "Quests", "📜"], ["/challenges", "Challenges", "🏆"], ["/party", "Party", "🛡️"], ["/guilds", "Guilds", "🏰"], ["/chronicle", "Chronicle", "📖"], ["/compare", "Compare", "⚔️"], [`/u/${me?.handle}`, "Profile", "👤"]];
  const mob = all.filter(([, l]) => !["Feed", "Party", "Guilds", "Compare", "Chronicle"].includes(l));
  return (<>{children}
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-zinc-800 bg-[#0c0c0e]/95 py-2 backdrop-blur md:hidden">
      {mob.map(([h, l, i]) => <Link key={h} href={h} className="flex flex-col items-center text-[10px] text-zinc-400"><span className="text-lg">{i}</span>{l}</Link>)}
    </nav>
    <nav className="fixed right-4 top-3 z-40 hidden gap-5 text-xs uppercase tracking-widest text-zinc-500 md:flex">
      {all.map(([h, l]) => <Link key={h} href={h} className="hover:text-amber-400">{l}</Link>)}
    </nav></>);
}
