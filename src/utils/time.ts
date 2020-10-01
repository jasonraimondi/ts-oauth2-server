export function getSecondsUntil(date: Date) {
  const expiresAtMs = date.getTime();
  return Math.ceil((expiresAtMs - Date.now()) / 1000);
}
