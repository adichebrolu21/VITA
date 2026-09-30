import { signIn } from "@/auth";
export default function Login() {
  return (
    <main className="min-h-screen grid place-items-center bg-[#0c0c0e] text-zinc-100 p-6">
      <form className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8"
        action={async (fd) => { "use server"; await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirectTo: "/" }); }}>
        <h1 className="text-center text-xl font-extrabold tracking-[.35em]">VITA</h1>
        <p className="text-center text-xs text-zinc-500">Your life. Your character.</p>
        <input name="email" type="email" defaultValue="adi@vita.dev" className="w-full rounded-lg bg-black/40 border border-zinc-800 p-3" />
        <input name="password" type="password" defaultValue="vita1234" className="w-full rounded-lg bg-black/40 border border-zinc-800 p-3" />
        <button className="w-full rounded-lg bg-amber-400 py-3 font-bold text-black">ENTER</button>
        <a href="/register" className="block text-center text-xs text-zinc-500 underline">Create a new character</a>
      </form>
    </main>
  );
}
