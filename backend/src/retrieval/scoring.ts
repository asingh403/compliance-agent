export const clampScore = (score: number) => Math.min(1, Math.max(0, score));

export const calculateCoverage = (scores: number[], target: number) => {
  const distinctScoreTotal = scores.reduce((total, score) => total + clampScore(score), 0);
  return Math.round(100 * Math.min(1, distinctScoreTotal / target));
};

export const calculateFinalScore = (vectorScore: number, rerankingScore: number) =>
  clampScore((0.35 * clampScore(vectorScore)) + (0.65 * clampScore(rerankingScore)));
