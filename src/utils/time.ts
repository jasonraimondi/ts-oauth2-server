/**
 * Counts the whole seconds between two dates. The server uses it for the
 * `expires_in` field of a token response.
 *
 * @param end - The later date
 * @param start - The earlier date, now by default
 * @returns The seconds from `start` to `end`, rounded down and negative once `end` has passed
 */
export function getSecondsUntil(end: Date, start: Date = new Date()): number {
  const time = end.getTime() - start.getTime();
  return Math.floor(time / 1000);
}

/**
 * Converts a date or a millisecond timestamp to whole seconds, the unit JWT
 * time claims use.
 *
 * @param ms - A date, or a timestamp in milliseconds
 * @returns The timestamp in seconds, rounded down
 */
export function roundToSeconds(ms: Date | number): number {
  if (ms instanceof Date) ms = ms.getTime();
  return Math.floor(ms / 1000);
}
