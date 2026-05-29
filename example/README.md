# Typescript OAuth2.0 Server Example

## Want a better example?

See the [ts-oauth2-server-example](https://github.com/jasonraimondi/ts-oauth2-server-example) repository for a more full example.

## Getting Started

```bash
cp .env.example .env
```

This example enables OIDC, which requires RS256 (asymmetric) signing. Generate an
RSA private key once and point `OAUTH_PRIVATE_KEY` at its PEM (see `.env.example`):

```bash
openssl genpkey -algorithm RSA -pkcs8 -out private.pem -pkeyopt rsa_keygen_bits:2048
```

```dotenv
OAUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
OAUTH_ISSUER=http://localhost:3000
```

The server then exposes the OIDC endpoints alongside the OAuth2 ones:
`GET /.well-known/openid-configuration`, `GET /jwks`, and `GET /userinfo`.

## OIDC and opaque authorization codes

If you enable OIDC with **opaque** authorization codes (`useOpaqueAuthorizationCodes: true`),
your `OAuthAuthCodeRepository` MUST persist and hydrate the `nonce`, `authTime`, and `maxAge`
fields. The library rebuilds the opaque code's payload from the stored row, so a dropped
`nonce` is lost across the authorize → token round trip and the library rejects the exchange
with `invalid_grant`. JWT auth codes carry these in the token itself and avoid this obligation.

This example's `prisma/schema.prisma`, `AuthCode` entity, and `AuthCodeRepository` already
persist these fields. After pulling the schema change, regenerate the client and push the
columns:

```bash
pnpm gen        # prisma generate
pnpm smoke      # proves nonce/authTime/maxAge survive an opaque-code round trip
```
