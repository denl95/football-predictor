/**
 * Calculates points for a prediction against the actual match result.
 *
 * Rules:
 *  3 pts – exact score
 *  2 pts – correct goal difference (implies correct winner / draw)
 *  1 pt  – correct winner or draw
 *  0 pts – wrong
 */
export function calculatePoints(
	predictedHome: number,
	predictedAway: number,
	actualHome: number,
	actualAway: number,
): number {
	if (predictedHome === actualHome && predictedAway === actualAway) return 3;

	const predictedGD = predictedHome - predictedAway;
	const actualGD = actualHome - actualAway;

	if (predictedGD === actualGD) return 2;

	if (Math.sign(predictedGD) === Math.sign(actualGD)) return 1;

	return 0;
}
