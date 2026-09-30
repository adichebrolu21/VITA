"use client";
import { useState } from "react";
const EMOJI = ["🔥", "❤️", "⚔️", "🏆"];
export default function ReactionBar({ activityId, counts, mine }: { activityId: string; counts: Record<string, number>; mine: string[] }) {
  const [c, setC] = useState(counts), [m, setM] = useState(new Set(mine));
  async function toggle(e: string) {
    const on = m.has(e), n = new Set(m); on ? n.delete(e) : n.add(e);
    setM(n); setC({ ...c, [e]: (c[e] ?? 0) + (on ? -1 : 1) }); // optimistic
    const r = await fetch("/api/reactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ activityId, emoji: e }) });
    if (!r.ok) { setM(m); setC(c); }
  }
  return <div className="mt-2 flex gap-2">{EMOJI.map(e =>
    <button key={e} onClick={() => toggle(e)} className={`rounded-full border px-3 py-1 text-xs transition active:scale-90 ${m.has(e) ? "border-amber-400 text-amber-400" : "border-zinc-800 text-zinc-500"}`}>{e} {c[e] || ""}</button>)}</div>;
}
