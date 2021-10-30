export function getSecondsUntil(date: Date, iat?: Date) {
  const start = iat ? iat.getTime() / 1000 : Math.floor(Date.now() / 1000);
  const time = date.getTime() / 1000;
  return Math.floor(time - start);
}

export function roundToSeconds(ms: Date | number) {
  if (ms instanceof Date) ms = ms.getTime();
  return Math.floor(ms / 1000);
}
