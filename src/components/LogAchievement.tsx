"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion } from "framer-motion";

type Res = { achievement: { xpAwarded: number; primaryCategory: string; evaluation: { difficulty: number; effort: number; impact: number; rarity: number; reason: string } };
  levelUp: { from: number; to: number; title: string } | null };

function Counter({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useState(() => { animate(0, to, { duration: 1.3, ease: "easeOut", onUpdate: x => setV(Math.round(x)) }); });
  return <>+{v.toLocaleString()}</>;
}

export default function LogAchievement() {
  const [open, setOpen] = useState(false), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null), [phase, setPhase] = useState<"eval" | "level">("eval"), [err, setErr] = useState("");
  const router = useRouter();
  const close = () => { setOpen(false); setRes(null); setText(""); setPhase("eval"); router.refresh(); };
  async function submit() {
    setBusy(true); setErr("");
    const r = await fetch("/api/achievements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    setBusy(false);
    if (!r.ok) return setErr(r.status === 429 ? "Slow down a little." : "Could not evaluate that.");
    setRes(await r.json());
  }
  const bars = res ? ([["Difficulty", res.achievement.evaluation.difficulty], ["Effort", res.achievement.evaluation.effort], ["Impact", res.achievement.evaluation.impact], ["Rarity", res.achievement.evaluation.rarity]] as const) : [];
  return (<>
    <button onClick={() => setOpen(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-9 py-4 text-sm font-extrabold tracking-[.14em] text-black shadow-2xl active:scale-95">+ LOG ACHIEVEMENT</button>
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5 backdrop-blur">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          {!res ? (<>
            <div className="mb-3 text-[11px] uppercase tracking-[.2em] text-zinc-500">Log achievement</div>
            <textarea autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={400} placeholder="What did you accomplish?" className="h-28 w-full resize-none rounded-xl border border-zinc-800 bg-black/40 p-3 outline-none focus:border-amber-400" />
            {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
            <div className="mt-3 flex gap-2"><button disabled={busy || text.trim().length < 3} onClick={submit} className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-black disabled:opacity-40">{busy ? "Evaluating…" : "Submit to Game Master"}</button>
              <button onClick={close} className="rounded-lg border border-zinc-800 px-5 py-3 text-zinc-400">Cancel</button></div>
          </>) : phase === "eval" ? (
            <div>
              <div className="text-[11px] uppercase tracking-[.2em] text-zinc-500">VITA Game Master</div>
              {bars.map(([n, v], i) => <div key={n} className="my-3 flex items-center gap-3 text-sm"><span className="w-20 text-zinc-500">{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800"><motion.div className="h-full bg-amber-400" initial={{ width: 0 }} animate={{ width: `${v * 10}%` }} transition={{ delay: 0.4 + i * 0.15, duration: 0.9 }} /></div><span className="w-8 text-right">{v.toFixed(1)}</span></div>)}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-6 text-center">
                <div className="text-lg">{res.achievement.primaryCategory}</div>
                <div className="mt-2 text-6xl font-extrabold text-amber-400"><Counter to={res.achievement.xpAwarded} /> <span className="text-2xl">XP</span></div>
                <p className="mt-2 text-sm text-zinc-500">{res.achievement.evaluation.reason}</p>
                <button onClick={() => res.levelUp ? setPhase("level") : close()} className="mt-5 rounded-lg bg-amber-400 px-6 py-3 font-bold text-black">Continue</button>
              </motion.div>
            </div>
          ) : (
            <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="text-center">
              <div className="text-[11px] uppercase tracking-[.2em] text-zinc-500">Level up</div>
              <div className="my-2 text-7xl font-extrabold">{res.levelUp!.from} → <span className="text-amber-400">{res.levelUp!.to}</span></div>
              <div className="text-xs uppercase tracking-[.2em] text-zinc-500">Title</div><div className="text-xl tracking-widest text-amber-400">“{res.levelUp!.title.toUpperCase()}”</div>
              <button onClick={close} className="mt-6 rounded-lg bg-amber-400 px-6 py-3 font-bold text-black">Onward</button>
            </motion.div>
          )}
        </div>
      </motion.div>)}</AnimatePresence>
  </>);
}
