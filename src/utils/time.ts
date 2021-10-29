export function getSecondsUntil(date: Date) {
  return roundToSeconds(date.getTime() - Date.now());
}

export function roundToSeconds(ms: Date | number) {
  if (ms instanceof Date) ms = ms.getTime();
  return Math.floor(ms / 1000);
}
