export function base64encode(str: string | Buffer) {
  if (typeof str === "string") str = Buffer.from(str);
  return str.toString("base64");
}

export function base64decode(str: string | Buffer) {
  if (typeof str === "string") str = Buffer.from(str, "base64");
  return str.toString("binary");
}

export function base64urlencode(str: string | Buffer) {
  return base64encode(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
