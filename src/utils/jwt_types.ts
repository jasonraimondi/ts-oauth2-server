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

/**
 * A JWS signing algorithm. This library signs with `HS256` when you give it a
 * secret string, and `RS256` when you give it an asymmetric key. OIDC requires
 * `RS256`, because a shared secret cannot be published in a JWKS.
 *
 * @see https://github.com/auth0/node-jsonwebtoken#algorithms-supported
 */
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

/**
 * A duration in the `ms` package format, such as `"1h"` or `"15m"`. A bare
 * number is read as milliseconds.
 */
export type StringValue = `${number}` | `${number}${UnitAnyCase}` | `${number} ${UnitAnyCase}`;

/**
 * A signing or verification key: a shared secret for `HS256`, or an asymmetric
 * key — with its passphrase when the key is encrypted — for `RS256`.
 */
export type Secret = string | Buffer | KeyObject | { key: string | Buffer; passphrase: string };

/**
 * The JOSE header of a signed token. `alg` names the signing algorithm and
 * `kid` names the key, which is how a relying party picks the right key out of
 * the JWKS. This library sets `typ` to `at+jwt` on an OIDC access token, per
 * RFC 9068.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7515.html#section-4.1
 */
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

/**
 * Options for signing a token, passed to {@link JwtInterface.sign}.
 * {@link JwtService} always overrides `algorithm` with the one its key uses,
 * and fills in `keyid` from the key only when neither `keyid` nor
 * `header.kid` is already set.
 */
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

/**
 * Options for verifying a token, passed to {@link JwtInterface.verify}. This
 * library pins `algorithms` to the one its signing key uses, so a token signed
 * with any other algorithm is rejected however this field is set.
 */
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
