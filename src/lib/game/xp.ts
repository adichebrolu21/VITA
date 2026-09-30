import { GAME } from "./config";
import type { RawEvaluation } from "./evaluator";

const { a, b } = GAME.curve;
export const xpForLevel = (n: number) => { const m = n - 1; return a * m + b * m * m; };
export const levelFromXp = (xp: number) =>
  Math.floor((-a + Math.sqrt(a * a + 4 * b * xp)) / (2 * b)) + 1;
export const statLevel = (xp: number) => levelFromXp(xp * GAME.statCurveScale);
export const titleForLevel = (l: number) => [...GAME.titles].reverse().find(([min]) => l >= min)![1];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function formulaXp(e: RawEvaluation) {
  const w = GAME.weights;
  const c = w.difficulty * e.difficulty + w.effort * e.effort + w.impact * e.impact +
            w.rarity * e.rarity + w.timeInvestment * e.timeInvestment;
  return 25 + 4975 * Math.pow(c / 10, 3);
}

/** Momentum decays gradually per missed day; +step on the first log of a day. */
export function momentumOnLog(current: number, lastActiveOn: Date | null, now = new Date()) {
  const day = (d: Date) => Math.floor(d.getTime() / 864e5);
  if (!lastActiveOn) return { value: 1 + GAME.momentum.step, firstOfDay: true };
  const gap = day(now) - day(lastActiveOn);
  const decayed = Math.max(1, current - GAME.momentum.decayPerMissedDay * Math.max(0, gap - 1));
  if (gap < 1) return { value: decayed, firstOfDay: false };
  return { value: Math.min(GAME.momentum.max, decayed + GAME.momentum.step), firstOfDay: true };
}

/** The ONLY place final XP is decided. Client and LLM values are never trusted. */
export function awardXp(e: RawEvaluation, ctx: { sameCategoryToday: number; momentum: number }) {
  const formula = formulaXp(e);
  const rec = clamp(e.recommendedXP, GAME.minXP, GAME.maxXP);
  const [lo, hi] = GAME.recommendationBand;
  let xp = clamp(formula, rec * lo, rec * hi);
  const rep = GAME.repeatFactors[Math.min(ctx.sameCategoryToday, GAME.repeatFactors.length - 1)];
  xp *= formula < GAME.tinyThreshold ? rep * rep : rep; // trivial spam decays twice as fast
  xp *= ctx.momentum;
  return {
    finalXp: Math.round(clamp(xp, GAME.minXP, GAME.maxXP)),
    formulaXp: Math.round(formula), repeatFactor: rep, momentumFactor: ctx.momentum,
  };
}
