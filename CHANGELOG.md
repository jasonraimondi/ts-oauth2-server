# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Repair the published artifact so it installs and type-checks cleanly for strict consumers: drop the `__name` helper that leaked into the `.d.ts` declarations (broke `skipLibCheck: false`), emit `/// <reference types="node" />` so Node globals resolve under `moduleResolution: bundler`, declare `h3` as an optional peer dependency, add the missing `./h3` export to `jsr.json`, and correct the `publishConfig` export conditions. ([#242](https://github.com/jasonraimondi/ts-oauth2-server/pull/242))

### Changed
- `@types/jsonwebtoken` and `@types/ms` are now optional `peerDependencies`. The published type declarations reference `jsonwebtoken`'s option types directly instead of bundling vendored copies, keeping a single source of truth. Consumers compiling with `skipLibCheck: false` install these two packages; the default `skipLibCheck: true` needs nothing. ([#242](https://github.com/jasonraimondi/ts-oauth2-server/pull/242))

## [5.0.0-rc.3] - 2026-06-08

### Fixed
- The `/token/revoke` endpoint now returns `401 invalid_client` when client authentication fails (a missing or invalid `client_id`, a wrong `client_secret`, or a confidential client with no secret) instead of silently returning `200`. RFC 7009 §2.1 requires a failed client authentication to be refused with an RFC 6749 §5.2 error response; the empty `200` is only correct for an invalid *token* (RFC 7009 §2.2). The introspect endpoint is harmonized for the missing-`client_id` case. Cross-client token-ownership mismatches and invalid/unknown/malformed tokens still return `200`. ([#234](https://github.com/jasonraimondi/ts-oauth2-server/issues/234))

## [5.0.0-rc.2] - 2026-06-07

### Added
- Add the `introspectionRequiresConfidentialClient` option (default `true`) to control whether the Token Introspection endpoint (RFC 7662 §4) rejects public clients. Set it to `false` to allow public clients to introspect their own tokens.

### Changed
- **BREAKING**: The Token Introspection endpoint now requires a confidential client by default (RFC 7662 §4), rejecting public clients with `invalid_client`. Opt out with `introspectionRequiresConfidentialClient: false`.
- The revoke (RFC 7009) and introspect (RFC 7662) endpoints now authenticate the *client's identity* — and its secret, for confidential clients — rather than asserting membership in the `client_credentials` grant. ([#233](https://github.com/jasonraimondi/ts-oauth2-server/pull/233))

### Fixed
- Token revocation no longer rejects legitimate clients that are not authorized for the `client_credentials` grant. A public PKCE SPA or an auth-code-only confidential client can now revoke its own tokens; previously the grant-membership check refused them. ([#233](https://github.com/jasonraimondi/ts-oauth2-server/pull/233))

## [5.0.0-rc.1] - 2026-06-06

### Fixed
- Default-import `jsonwebtoken` so the built ESM bundle loads under native Node. The named `import { sign, verify }` resolved to `undefined` when the CJS-only `jsonwebtoken` package was loaded from the compiled ESM output, throwing at runtime. ([#232](https://github.com/jasonraimondi/ts-oauth2-server/pull/232))

## [5.0.0-rc.0] - 2026-05-31

### Added
- **OpenID Connect (OIDC) support.** Opt in by setting the top-level `issuer` and a nested `oidc` config block (with an RS256 `JwtService`). The authorization-code flow then issues a signed `id_token` alongside the access token, and three new endpoints become available: `authorizationServer.userInfo(req)`, `authorizationServer.openidConfiguration()`, and `authorizationServer.jwks()`. Access-token verification for UserInfo runs through a reusable `AccessTokenVerifier` seam. See the [OIDC getting-started guide](https://tsoauth2server.com/docs/oidc/getting_started) and [upgrade guide](https://tsoauth2server.com/docs/upgrade_guide). The individual building blocks are listed below.
- Add RS256 `JwtService` key options with public JWKS export and RFC 7638 thumbprint `kid` defaults.
- Add `OAuthException.invalidToken()` and `OAuthException.insufficientScope()` helpers for OIDC bearer-token responses.
- Add the optional `oidc` authorization-server config block, construction guards, `jwks()` endpoint response, and reusable `AccessTokenVerifier` seam.
- Add OIDC Core §5.4 scope-to-claim mapping and scope-gated claim filtering helpers.
- Parse openid-scoped OIDC authorization parameters (`nonce`, `max_age`, `prompt`, `login_hint`, `display`, `ui_locales`, `acr_values`, `id_token_hint`) onto `AuthorizationRequest`; consumers set `authTime` after authentication when `max_age` is requested.
- Thread OIDC `nonce`, `authTime`/`auth_time`, and `maxAge`/`max_age` through the auth code entity and payload for both JWT and opaque codes, with a fail-loud guard when an opaque-code repository drops the persisted `nonce` (or `authTime` required by `max_age`) and `max_age` freshness enforcement at token time.
- Issue a signed `id_token` alongside the access token in the authorization code flow when the `openid` scope is granted, carrying `iss`, `sub`, `aud`, `exp`, `iat`, conditional `nonce`/`auth_time`, and `at_hash`. Adds `buildIdTokenClaims`, `calculateAtHash`, and `oidcSubjectIdentifier` helpers, and auto-recognizes the standard OIDC scopes (`openid`, `profile`, `email`, `address`, `phone`) for the authorization-code grant only when OIDC is enabled.
- Add the optional `getIdTokenClaims` OIDC hook for adding custom claims (e.g. roles, tenant, acr) to issued ID tokens. An explicit strip-then-merge against the exported `PROTOCOL_CLAIM_NAMES` constant guarantees protocol claims always win and hook output reaches the JWT payload only, never the JOSE header; a throwing hook surfaces as `invalid_grant`.
- Add the optional `OAuthTokenRepository.isAccessTokenRevoked?` hook so UserInfo can reject flag-revoked access tokens that still have live token rows; without it, UserInfo detects deleted or expired tokens via `getByAccessToken`.

### Changed
- **BREAKING**: Raise the minimum supported Node.js runtime to 22.
- **BREAKING**: The implicit grant now appends tokens to the redirect URI using URI fragments by default, as recommended by RFC 6749 §4.2.2. Set `implicitRedirectMode: "query"` to preserve the previous query-string behavior for legacy clients.
- When OIDC is enabled, access tokens minted through the built-in grants now carry the JOSE header `typ: "at+jwt"` (RFC 9068). The `BearerTokenResponse` body gains an optional `id_token` string for OIDC `openid` authorization-code flows. Non-OIDC token wire format is unchanged.
- `JwtService.verify()` now pins verification to the service's configured algorithm and ignores caller-supplied `algorithms` options. It also rejects any token whose payload is not a JSON object (the method has always declared a `Record<string, unknown>` return), so a string-payload JWT no longer resolves with the raw string.
- `JwtService.sign()` now forwards signing options, including JOSE header overrides such as `typ: "at+jwt"`.
- Internal: stop importing the removed `crypto.JsonWebKey` type (dropped in `@types/node` v25); the RSA JWK export is now typed against a small local interface so `tsc` passes. No public API or runtime change.

### Known limitations (OIDC v1)
- No `id_token` is issued on the refresh-token grant — only in the authorization-code exchange.
- No `offline_access` auto-recognition; refresh-token issuance stays consumer-owned.
- RS256 only — ES256 and overlapping multi-key rotation are deferred (a single-key model cannot satisfy OIDC Discovery §3 with an ES256 key).
- UserInfo returns plain JSON only; signed/encrypted UserInfo responses are not supported.
- Opaque authorization codes require the consumer repository to persist `nonce`, `authTime`, and `maxAge` when present; JWT authorization codes are recommended for OIDC.

## [4.3.5] - 2026-05-08

### Fixed
- Published `exports` field pointed at `./src/*.ts` instead of compiled `./dist/*.js`, breaking every subpath import (root, `/vanilla`, `/express`, `/fastify`, `/h3`) for consumers of 4.3.3 and 4.3.4. Root cause: commit 197a400 switched the publish workflow from `pnpm publish` to `npm publish` to use OIDC trusted publishing, but npm ignores `publishConfig.exports`, so the development-time exports (pointing at `src` for vitest self-imports) leaked into the published artifact. Reverted to `pnpm publish` (pnpm 11.0.7+ supports OIDC trusted publishing). Reported by [@tobiasdcl](https://github.com/tobiasdcl) ([#228](https://github.com/jasonraimondi/ts-oauth2-server/issues/228)).

### Changed
- Internal: use `import type` for `OAuthTokenIntrospectionResponse` in `client_credentials.grant.ts` to keep it erased from the JS bundle.

## [4.3.4] - 2026-04-25

### Chore
- Add `repository.url` to `package.json` for npm metadata.

## [4.3.3] - 2026-04-25

### Chore
- CI: switch npm publish to OIDC trusted publishing.

## [4.3.2] - 2026-04-25

### Fixed
- Build: re-export `AuthorizationServerOptions` and `GrantIdentifier` with the `type` modifier. Rolldown rejects value re-exports for type-only symbols, which broke `pnpm build` (and the `prepublishOnly` hook on v4.3.1, blocking the npm + JSR publish).

### Chore
- CI: bump `.node-version` to 22.12.0 to satisfy rolldown's engine constraint (`^20.19.0 || >=22.12.0`); the previous 20.12.2 caused pnpm to skip the `@rolldown/binding-linux-x64-gnu` optional dep, breaking the publish workflow.

## [4.3.1] - 2026-04-25

### Added
- Re-export `LoggerService` and `ConsoleLoggerService` from the package entry with JSDoc on wiring into `AuthorizationServer`.

### Changed
- Internal: extract opaque-vs-JWT branching into `AuthCodeEncoder` and `RefreshTokenEncoder` strategies. Subclass overrides of `encrypt`/`decrypt`/`encryptRefreshToken` hooks still participate.
- Internal: unexport six unreachable encoder helper types; emitted `.d.ts` unchanged.
- Internal: move `AuthorizationServerOptions` to `src/options.ts` and `GrantIdentifier` to its own leaf file to break circular imports (10 → 2). Both still re-exported from original locations.

### Fixed
- Opaque refresh token expiration check compared seconds to a `Date`, letting expired tokens through and rejecting non-expiring tokens (`refreshTokenExpiresAt: null`) ([#212](https://github.com/jasonraimondi/ts-oauth2-server/issues/212)).
- JWT auth code resolve now rejects payloads missing `auth_code_id`, `client_id`, finite `expire_time`, or string-array `scopes`. Previously missing `expire_time` silently failed open. Revoke's `unverifiedDecode` path stays lenient per RFC 7009.

### Chore
- Bump deps: TypeScript 6, Vitest 4, Vite 8, Express 5, Fastify 5, body-parser 2, plus `@types/*`, `prettier`, `tsdown`. TS6 adjustments: drop `baseUrl`, enable `skipLibCheck`, narrow `URLSearchParams` and `ms()` call sites. h3 stays on 1.15.11 (2.x still RC).

## [4.3.0] - 2026-02-23

### Added
- Add `implicitRedirectMode` option for fragment-based redirects
- Add h3 adapter entrypoint and tests

### Changed
- Migrate bundler from tsup to tsdown

### Fixed
- Use finalized scopes when encrypting implicit grant access token

## [4.2.2] - 2025-12-04

### Fixed
- Prevent crashes from generic repository errors in adapters

## [4.2.1] - 2025-12-03

### Fixed
- Missing finalize calls in AuthorizationCodeGrant, ImplicitGrant, and TokenExchangeGrant

## [4.2.0] - 2025-10-31

### Added
- Support for opaque refresh tokens
- originatingAuthCodeId now provided as argument to extraTokenFields callback

### Fixed
- originatingAuthCodeId now properly populated during RefreshTokenGrant
- originatingAuthCodeId now properly populated before calling tokenRepository.persist

## [4.1.1] - 2025-10-20

### Fixed
- Reset originatingAuthCodeId in refresh_token scope test
- Package version bump for patch release

## [4.1.0] - 2025-10-19

### Added
- Support for opaque authorization codes
- Documentation for `useOpaqueAuthorizationCodes` option
- Agent for answering questions
- Expanded FAQ on token validation and errors
- Logger documentation improvements

### Fixed
- Null safety checks for opaque authorization code validation
- Token validation documentation to use jti claim

## [4.0.11] - 2025-09-20

### Added
- Optional logger support for debugging token operations, revocations, and grant processing errors

### Fixed
- Missing validation parameters in `getUserByCredentials` calls in authorization code grant
- Client ownership validation for token revocation per RFC 7009
- Duplicate dts keys in tsup build configuration

### Security
- Enhanced validation for client ownership during token revocation

## [4.0.10] - 2025-08-04

### Fixed
- Content-type header handling for charset parameters normalization
- URL-encoded body parsing improvements

## [4.0.9] - 2025-08-04

### Fixed
- Allow empty client secrets in basic authentication

## [4.0.8] - 2025-08-04

### Fixed
- Unauthorized client and scope exceptions now correctly throw 401 instead of 400
- Missing finalize scopes in client credentials and refresh token grants

## [4.0.7] - 2025-06-25

### Fixed
- Express adapter build errors from response status handling

## [4.0.6] - 2025-06-20

### Fixed
- Introspect and revoke endpoints now return falsey values instead of throwing for invalid tokens (per OAuth spec)
- Token revocation inconsistencies to match OAuth spec RFC 7009

## [4.0.5] - 2025-06-05

### Fixed
- RequestFromVanilla headers handling
- Swallowed exceptions from improper exports in adapters

## [4.0.4] - 2025-06-04

### Fixed
- Crypto imports to use direct crypto instead of node:crypto
- Vanilla adapters added to JSR exports
- Method check removed for requestFromVanilla
- GET method implementation
- Audience claim now supports string array or single string value
- Custom grant prefix override capability

## [4.0.3] - 2025-03-28

### Added
- Export `guardAgainstInvalidClientScopes` utility for validating requested scopes against a client's allowed scopes

### Fixed
- Call `scopeRepository.finalize()` in the client_credentials and refresh_token grants, which was previously skipped ([#159](https://github.com/jasonraimondi/ts-oauth2-server/issues/159))
- Return HTTP 401 instead of 400 for unauthorized client and unauthorized scope exceptions

## [4.0.2] - 2024-08-24

### Added
- Export the `isOAuthError` helper
- Nuxt adapter documentation

## [4.0.1] - 2024-08-12

### Fixed
- Express adapter: derive the response status from `res.statusCode`, fixing build errors and incorrect status-code propagation

## [4.0.0] - 2024-08-11

### Added
- Support for token introspection with client credentials authentication
- Custom scope delimiter support
- More explicit error messages when client is determined to be invalid
- Automatic enabling of client_credentials and refresh_token grants
- Optional status parameter in OAuth response constructor
- Guard utility function against invalid client scopes
- Export of isOAuthError helper function

### Changed
- **BREAKING**: Default authentication with client_credentials for introspect and revoke endpoints
- Configuration options renamed to `authenticateIntrospect` & `authenticateRevoke`

### Security
- Enhanced default security for introspect and revoke endpoints requiring client authentication

## [3.6.0] - 2024-08-11

### Added
- Configuration option for toggling revoke and introspect authentication
- Nuxt documentation

### Changed
- Preparation for v4.0.0 authentication defaults

## [3.5.0] - 2024-08-04

_Only 3.5.0-alpha.0 shipped; never published as final — these changes shipped in 3.6.0._

### Added
- Token introspection (RFC 7662): `AuthorizationServer.introspect()`, `canRespondToIntrospectRequest`/`respondToIntrospectRequest` on the grant interface, and an exported `OAuthTokenIntrospectionResponse` type
- Token introspection support for the client_credentials grant
- Optional `getByAccessToken` on `OAuthTokenRepository` (required only when introspecting access tokens)
- Configurable `scopeDelimiter` option (defaults to a space)

### Changed
- **BREAKING**: `requestFromVanilla` is now async and returns a `Promise<OAuthRequest>`
- The vanilla adapter now supports readable-stream request bodies

## [3.4.1] - 2024-07-25

### Fixed
- `OAuthException`s are no longer swallowed by the Express and Fastify error handlers when multiple `OAuthException` classes exist across bundles; detection now uses a marker-based `isOAuthError` helper instead of `instanceof` ([#82](https://github.com/jasonraimondi/ts-oauth2-server/issues/82))

## [3.4.0] - 2024-07-05

### Added
- Vanilla (Web-standard `Request`/`Response`) adapter — `requestFromVanilla`, `responseFromVanilla`, and `responseToVanilla` — exported via the new `./vanilla` entry point

### Changed
- Import `crypto` (bare specifier) instead of `node:crypto` for broader runtime compatibility
- Add explicit return types to the Fastify adapter functions

### Fixed
- `requestFromVanilla` now parses the request body regardless of HTTP method

## [3.3.1] - 2024-05-28

### Added
- JSR publishing support (`jsr.json`)

### Fixed
- Export the Express and Fastify adapters on JSR via the `./express` and `./fastify` subpaths
- Return no credentials from basic-auth parsing when the decoded value lacks both a client id and secret

## [3.3.0] - 2024-05-27

### Added
- Custom grant support — register any `AbstractGrant` instance (new `CustomGrant` base with a `custom:${string}` identifier)
- Support `issuer` and `audience` in access-token JWT claims via the new `issuer` option and `aud`/`audience` request parameters

### Changed
- The audience claim now accepts a single string or an array of strings
- Accept any `AbstractGrant` instance as a custom grant, no longer requiring the `custom:` identifier prefix

### Fixed
- `OAuthResponse.get()` returned an empty string instead of the requested header value

## [3.2.0] - 2024-03-06

### Added
- Token-exchange grant (RFC 8693): `urn:ietf:params:oauth:grant-type:token-exchange` via the new `TokenExchangeGrant` and `ProcessTokenExchangeFn`
- Documentation for the token-exchange grant

## [3.1.0] - 2024-02-10

_First npm-published release of the 3.0.4 line (3.0.4 was tagged but never published); no further changes._

## [3.0.4] - 2024-02-10

_Tagged but never published to npm; superseded by 3.1.0 the same day._

### Added
- Match redirect URIs while ignoring the port (compare protocol, host, and path) ([#104](https://github.com/jasonraimondi/ts-oauth2-server/issues/104))

## [3.0.2] - 2023-07-04

### Fixed
- Remove `@swc/core` from runtime dependencies (it is a dev-only tool)

## [3.0.1] - 2023-06-10

### Changed
- Publish both CommonJS and ESM builds (via tsup), restoring CommonJS consumption

## [3.0.0] - 2023-06-07

### Added
- Support `extraTokenFields` in the client_credentials grant ([#79](https://github.com/jasonraimondi/ts-oauth2-server/issues/79))
- Pass the authenticated `client` to the `extraTokenFields` method
- Make the user and auth-code repositories optional, required only by the grants that need them (authorization_code, password)
- Replace VuePress with VitePress for the documentation site
- v2-to-v3 migration guide

### Changed
- **BREAKING**: Ship as ESM-only; the CommonJS build is dropped (reverted in 3.0.1)
- **BREAKING**: Default `tokenCID` is now `"id"` (was `"name"`)
- **BREAKING**: Remove the `setOptions` method
- **BREAKING**: Pass options as a grant constructor argument
- Add a default options system
- Require Node.js >= 16
- Use explicit imports for better tree-shaking

### Removed
- **BREAKING**: Remove the deprecated `response` parameter from `respondToAccessTokenRequest`

### Fixed
- Fix package export typings for the ESM module
- Include the Express and Fastify adapter typings in the publish config
- Fix type resolution for subpath (submodule) imports

## [2.6.1] - 2022-12-30

### Security
- Upgrade `jsonwebtoken` from 8.5.1 to 9.0.0

## [2.6.0] - 2022-12-18

### Added
- Revoke all tokens descended from an authorization code when that code is reused, via the new optional `OAuthTokenRepository.revokeDescendantsOf()` and an `originatingAuthCodeId` field on `OAuthToken` ([#62](https://github.com/jasonraimondi/ts-oauth2-server/issues/62))

### Changed
- **BREAKING**: `OAuthTokenRepository.revoke()` is required again (reverting the optional marker added in 2.5.0)

## [2.5.0] - 2022-12-06

### Added
- Token revocation (RFC 7009): `AuthorizationServer.revoke(req)`, with revoke support in the refresh-token and authorization-code grants
- Allow `userRepository.extraAccessTokenFields()` to set the `iss` and `aud` access-token claims ([#67](https://github.com/jasonraimondi/ts-oauth2-server/issues/67))

### Changed
- Mark `OAuthTokenRepository.revoke()` as optional

## [2.4.0] - 2022-10-02

### Added
- Add an index signature (`[key: string]: any`) to the `OAuthClient` interface so consumers can attach custom fields

### Changed
- **BREAKING**: `OAuthTokenRepository.issueRefreshToken()` now receives the `OAuthClient` as a second argument ([#61](https://github.com/jasonraimondi/ts-oauth2-server/issues/61))

### Fixed
- Widen the `makeRedirectUrl` params type to match the `URLSearchParams` constructor signature ([#66](https://github.com/jasonraimondi/ts-oauth2-server/issues/66))

## [2.3.0] - 2022-09-23

### Added
- Add the `requiresS256` server option to reject the `plain` `code_challenge_method` and require PKCE S256 ([#57](https://github.com/jasonraimondi/ts-oauth2-server/issues/57))

### Fixed
- Throw an OAuth `400` exception on a malformed JWT instead of crashing ([#59](https://github.com/jasonraimondi/ts-oauth2-server/issues/59))
- Return an informative exception when `client_id` is missing from a `response_type=code` request, instead of silently declining to handle it ([#56](https://github.com/jasonraimondi/ts-oauth2-server/issues/56))

## [2.2.5] - 2022-08-24

### Fixed
- Restrict the build `tsconfig` to `src`, keeping root files out of the published package

## [2.2.4] - 2022-06-20

### Fixed
- Export `OAuthException` from the package entry point (previously not re-exported)

## [2.2.3] - 2022-05-06

### Changed
- Drop the `Readonly<...>` wrappers from `AuthorizationServerOptions` properties (`notBeforeLeeway`, `requiresPKCE`, `tokenCID`)

### Fixed
- The implicit grant now responds only to authorization requests and correctly reports that it cannot handle access-token requests

## [2.2.2] - 2021-11-16

### Added
- Add the `tokenCID` server option (`"id" | "name"`, default `"name"`) to choose the JWT `cid` claim source (defaults to `"id"` in 3.0.0)

## [2.2.1] - 2021-11-16

### Deprecated
- `respondToAccessTokenRequest(request, response)` — the `response` argument is now ignored; call `respondToAccessTokenRequest(request)`. Logs a deprecation warning; removed in 3.0.0

## [2.2.0] - 2021-11-11

### Added
- Support returning a `Promise` from `OAuthAuthCodeRepository.issueAuthCode` (`OAuthAuthCode | Promise<OAuthAuthCode>`)
- Add an optional `iat` argument to the `getSecondsUntil` time helper

### Fixed
- Await async `issueAuthCode` so auth-code repositories returning a `Promise` work correctly
- Adapt JWT seconds handling to node-jsonwebtoken (floor-based seconds calculation)

## [2.1.0] - 2021-10-13

_Maintenance release — no functional changes since 2.0.5._

## [2.0.5] - 2021-10-13

### Added
- Add the `notBeforeLeeway` server option to offset the JWT `nbf` (Not Before) claim

## [2.0.4] - 2021-10-12

### Added
- Security policy (`SECURITY.md`)

### Fixed
- Strip the query component from `redirect_uri` before matching it against a client's registered redirect URIs

## [2.0.3] - 2021-09-22

### Added
- `OAuthUserIdentifier` type; user identifiers may now be `string | number` across the user/scope repositories and the authorization_code grant

### Fixed
- Replace the tsdx build with plain `tsc` output so all adapters are included in the published package ([#27](https://github.com/jasonraimondi/ts-oauth2-server/issues/27))

## [2.0.2] - 2021-09-22

### Added
- Export `generateRandomToken` from the package entry point

## [2.0.1] - 2021-09-11

### Added
- Export the time utilities from the package entry point

## [2.0.0] - 2021-09-11

### Added
- Adapter usage documentation guide
- Export `CodeChallengeMethod` from the package entry point

### Changed
- **BREAKING**: `handleExpressResponse` signature changed from `(req, res, response)` to `(expressResponse, oauthResponse)`
- **BREAKING**: Rename the Fastify adapter's `handleFastifyResponse(req, res, response)` to `handleFastifyReply(res, response)`

### Removed
- **BREAKING**: Drop barrelsby; the package entry point no longer re-exports incidental internals such as `OAuthException`

## [1.3.0] - 2021-09-11

_Only pre-releases (1.3.0-rc.0…rc.4) shipped; never published as final — these changes shipped in 2.0.0._

### Added
- Framework adapter modules `./adapters/express` and `./adapters/fastify` exposing the `requestFrom*`/`responseFrom*` helpers, adding Fastify support alongside Express
- `handleExpressResponse`/`handleExpressError` and `handleFastifyResponse`/`handleFastifyError` helpers, plus a `generateRandomToken` util
- Prisma + Express, Prisma + Fastify, and TypeORM + Express integration examples

### Changed
- **BREAKING**: Move the Express/Fastify request and response helpers out of the package root into the `./adapters/express` and `./adapters/fastify` entry points
- **BREAKING**: Stop re-exporting `OAuthException`, the code verifiers (`PlainVerifier`/`S256Verifier`/`CodeChallengeMethod`), the `bearer_token`/`redirect` responses, and the `array`/`time`/`response` utils from the package root

### Fixed
- Restore `S256` (uppercase) as the canonical `code_challenge_method` value, conforming to RFC 7636 ([#25](https://github.com/jasonraimondi/ts-oauth2-server/issues/25))

## [1.2.0] - 2021-06-08

_Tagged only as 1.2.0-rc.0; never published to npm as a final release — these changes shipped in 2.0.0._

### Added
- Validate `code_challenge_method` on the authorization request, rejecting any value other than `S256` or `plain` with an `invalid_request` error

### Changed
- Type `codeChallengeMethod` as the `CodeChallengeMethod` string union (`S256`/`plain`) across the auth-code grant, authorization request, and `OAuthAuthCode` entity instead of a loose `string`
- Allow `null` (in addition to `undefined`) on optional entity fields: `OAuthClient.secret`, `OAuthToken.refreshToken`/`refreshTokenExpiresAt`/`user`, and `OAuthAuthCode.redirectUri`/`codeChallenge`/`codeChallengeMethod`/`user`

## [1.1.1] - 2021-05-24

### Added
- Add `enableGrantTypes()` on `AuthorizationServer` to enable multiple grants in one call, each with an optional access-token TTL
- TypeORM integration example

## [1.1.0] - 2021-05-12

### Added
- Add `setOptions()` on `AuthorizationServer` to set or override server options after construction

### Changed
- **BREAKING**: Remove the `useUrlEncode` option; PKCE S256 challenges are now always compared base64url-encoded ([#17](https://github.com/jasonraimondi/ts-oauth2-server/issues/17))

### Fixed
- Compute the PKCE S256 hash from the raw SHA-256 digest (binary) rather than its hex string, matching RFC 7636

## [1.0.4] - 2021-04-26

### Changed
- `AuthorizationServer` now accepts a partial options object; only the options you override need to be supplied, with the rest falling back to defaults
- Change the default for `useUrlEncode` from `false` to `true`

## [1.0.3] - 2021-04-26

### Added
- Add the `useUrlEncode` option to `AuthorizationServerOptions` to control whether the S256 PKCE code challenge is base64url-encoded (defaults to `false`)
- Add an optional `useUrlEncode` parameter to `ICodeChallenge.verifyCodeChallenge`

## [1.0.2] - 2021-03-16

### Fixed
- Fix scope parsing in the refresh_token grant so a refresh request that omits the `scope` parameter falls back to the existing token's scopes instead of failing

## [1.0.1] - 2021-02-19

_Maintenance release — dependency updates and internal cleanup; no user-facing changes._

## [1.0.0] - 2020-10-23

### Added
- Initial stable release
- Complete OAuth 2.0 authorization server implementation
- Support for multiple grant types (authorization_code, client_credentials, password, implicit, refresh_token)
- Framework adapters for Express and Fastify
- Repository pattern for data persistence
- Comprehensive test suite

### Security
- RFC-compliant OAuth 2.0 implementation
- PKCE (Proof Key for Code Exchange) support
- JWT token handling with proper validation
