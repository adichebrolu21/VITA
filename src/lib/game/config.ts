export const GAME = {
  minXP: 5,
  maxXP: 5000,
  recommendationBand: [0.6, 1.4] as const, // LLM advice can only move the formula within this band
  weights: { difficulty: 0.25, effort: 0.25, impact: 0.2, rarity: 0.1, timeInvestment: 0.2 },
  curve: { a: 450, b: 50 }, // cumulative XP for level n = a(n-1) + b(n-1)^2 -> 500, 1100, 1800...
  statCurveScale: 1.5,
  repeatFactors: [1, 0.7, 0.5, 0.3, 0.15], // nth same-category log in one day
  tinyThreshold: 60,
  momentum: { max: 1.5, step: 0.05, decayPerMissedDay: 0.05 },
  secondaryShare: 0.3,
  rateLimit: { max: 10, windowMs: 60_000 },
  titles: [[1, "The Newcomer"], [4, "The Apprentice"], [8, "The Builder"], [12, "The Veteran"], [20, "The Champion"], [30, "The Legend"]] as const,
};
