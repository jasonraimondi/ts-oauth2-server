import type { KeyObject } from "crypto";

/**
 * Public JWT option types vendored from `@types/jsonwebtoken@9` (and the
 * `StringValue` backport from `@types/ms`). They appear in this library's
 * public surface (`JwtInterface`, `JwtService`, `AbstractGrant#encrypt`).
 *
 * Vendoring keeps the published declarations self-contained: consumers no
 * longer need `@types/jsonwebtoken` (or `@types/ms`) installed to compile
 * against this package with `skipLibCheck: false`. The shapes are kept
 * structurally identical to upstream so they remain assignable to the
 * `jsonwebtoken` runtime functions and stay non-breaking for consumers.
 */

// https://github.com/auth0/node-jsonwebtoken#algorithms-supported
export type Algorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "none";

// Backported from `@types/ms@2.1.0` (which mirrors ms@3).
type Unit =
  | "Years"
  | "Year"
  | "Yrs"
  | "Yr"
  | "Y"
  | "Weeks"
  | "Week"
  | "W"
  | "Days"
  | "Day"
  | "D"
  | "Hours"
  | "Hour"
  | "Hrs"
  | "Hr"
  | "H"
  | "Minutes"
  | "Minute"
  | "Mins"
  | "Min"
  | "M"
  | "Seconds"
  | "Second"
  | "Secs"
  | "Sec"
  | "s"
  | "Milliseconds"
  | "Millisecond"
  | "Msecs"
  | "Msec"
  | "Ms";

type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;

export type StringValue = `${number}` | `${number}${UnitAnyCase}` | `${number} ${UnitAnyCase}`;

export type Secret = string | Buffer | KeyObject | { key: string | Buffer; passphrase: string };

// standard names https://www.rfc-editor.org/rfc/rfc7515.html#section-4.1
export interface JwtHeader {
  alg: string | Algorithm;
  typ?: string | undefined;
  cty?: string | undefined;
  crit?: Array<string | Exclude<keyof JwtHeader, "crit">> | undefined;
  kid?: string | undefined;
  jku?: string | undefined;
  x5u?: string | string[] | undefined;
  "x5t#S256"?: string | undefined;
  x5t?: string | undefined;
  x5c?: string | string[] | undefined;
}

export interface SignOptions {
  algorithm?: Algorithm | undefined;
  keyid?: string | undefined;
  expiresIn?: StringValue | number;
  notBefore?: StringValue | number | undefined;
  audience?: string | string[] | undefined;
  subject?: string | undefined;
  issuer?: string | undefined;
  jwtid?: string | undefined;
  mutatePayload?: boolean | undefined;
  noTimestamp?: boolean | undefined;
  header?: JwtHeader | undefined;
  encoding?: string | undefined;
  allowInsecureKeySizes?: boolean | undefined;
  allowInvalidAsymmetricKeyTypes?: boolean | undefined;
}

export interface VerifyOptions {
  algorithms?: Algorithm[] | undefined;
  audience?: string | RegExp | [string | RegExp, ...(string | RegExp)[]] | undefined;
  clockTimestamp?: number | undefined;
  clockTolerance?: number | undefined;
  /** return an object with the decoded `{ payload, header, signature }` instead of only the usual content of the payload. */
  complete?: boolean | undefined;
  issuer?: string | [string, ...string[]] | undefined;
  ignoreExpiration?: boolean | undefined;
  ignoreNotBefore?: boolean | undefined;
  jwtid?: string | undefined;
  /**
   * If you want to check `nonce` claim, provide a string value here.
   * It is used on Open ID for the ID Tokens. ([Open ID implementation notes](https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes))
   */
  nonce?: string | undefined;
  subject?: string | undefined;
  maxAge?: string | number | undefined;
  allowInvalidAsymmetricKeyTypes?: boolean | undefined;
}
