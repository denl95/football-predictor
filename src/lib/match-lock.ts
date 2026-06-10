/**
 * A match is "started" once it has kicked off by the clock, or the sync has
 * already marked it LIVE/FINISHED. At that point predictions are locked (no new
 * or edited picks) and everyone's predictions become public.
 *
 * We check the scheduled time rather than relying solely on `status === "LIVE"`,
 * because the status is only refreshed when the sync runs (the deployed cron is
 * daily), so a match can be in progress while still stored as UPCOMING.
 */
export function hasMatchStarted(
	match: { status: string; scheduledAt: Date },
	now: Date = new Date(),
): boolean {
	return (
		match.status !== "UPCOMING" || match.scheduledAt.getTime() <= now.getTime()
	);
}
