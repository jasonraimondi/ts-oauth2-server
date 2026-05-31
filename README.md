# TypeScript OAuth2.0 Server

[![JSR](https://jsr.io/badges/@jmondi/oauth2-server?style=flat-square)](https://jsr.io/@jmondi/oauth2-server)
[![NPM Version](https://img.shields.io/npm/v/%40jmondi%2Foauth2-server?style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)
[![GitHub Workflow Status]( https://img.shields.io/github/actions/workflow/status/jasonraimondi/ts-oauth2-server/build-and-test.yml?branch=main&style=flat-square)](https://github.com/jasonraimondi/ts-oauth2-server)
[![Test Coverage](https://codecov.io/gh/jasonraimondi/ts-oauth2-server/branch/main/graph/badge.svg?token=F7VTS15XOJ)](https://codecov.io/gh/jasonraimondi/ts-oauth2-server)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

`@jmondi/oauth2-server` is a standards compliant implementation of an OAuth 2.0 authorization server written in TypeScript.

Requires `node >= 22`. [Read the docs](https://tsoauth2server.com/)

The following OAuth and OpenID Connect specifications are implemented:

- [RFC6749 "OAuth 2.0"](https://tools.ietf.org/html/rfc6749)
- [RFC6750 "The OAuth 2.0 Authorization Framework: Bearer Token Usage"](https://tools.ietf.org/html/rfc6750)
- [RFC7009 "OAuth 2.0 Token Revocation"](https://tools.ietf.org/html/rfc7009)
- [RFC7519 "JSON Web Token (JWT)"](https://tools.ietf.org/html/rfc7519)
- [RFC7636 "Proof Key for Code Exchange by OAuth Public Clients"](https://tools.ietf.org/html/rfc7636)
- [RFC7662 "OAuth 2.0 Token Introspection"](https://tools.ietf.org/html/rfc7662)
- [RFC8693 "OAuth 2.0 Token Exchange"](https://datatracker.ietf.org/doc/html/rfc8693)
- [RFC9068 "JWT Profile for OAuth 2.0 Access Tokens"](https://www.rfc-editor.org/rfc/rfc9068)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)

Out of the box it supports the following grants:

- [Authorization code grant](https://tsoauth2server.com/docs/grants/authorization_code)
- [Client credentials grant](https://tsoauth2server.com/docs/grants/client_credentials)
- [Refresh grant](https://tsoauth2server.com/docs/grants/refresh_token)
- [Implicit grant](https://tsoauth2server.com/docs/grants/implicit) // not recommended 
- [Resource owner password credentials grant](https://tsoauth2server.com/docs/grants/password) // not recommended

Implicit redirect mode:

The implicit grant appends tokens to the redirect URI fragment by default, as recommended by RFC 6749. Set `implicitRedirectMode: "query"` only for legacy clients that depend on the previous query-string behavior.

OpenID Connect support:

OIDC is opt-in and built on the authorization code grant. When enabled with an `issuer`, an RS256 `JwtService`, and an `oidc` configuration block, authorization code exchanges granted the `openid` scope include a signed `id_token`.

The OIDC helpers expose the standard endpoints through the same `ResponseInterface` used by the OAuth endpoints:

- `authorizationServer.openidConfiguration()` for `/.well-known/openid-configuration`
- `authorizationServer.jwks()` for publishing the public JWKS
- `authorizationServer.userInfo(req)` for scope-filtered UserInfo claims

OIDC configuration also supports `getUserClaims`, optional `getIdTokenClaims`, standard OIDC scope recognition for the authorization code grant, and `typ: "at+jwt"` access tokens. See the [OIDC getting-started guide](https://tsoauth2server.com/docs/oidc/getting_started) for a full example.

Framework support:

The included adapters are just helper functions, any framework should be supported. Take a look at the adapter implementations to learn how you can create custom adapters for your favorite tool!

- [VanillaJS](https://tsoauth2server.com/docs/adapters/vanilla)
- [Express](https://tsoauth2server.com/docs/adapters/express)
- [Fastify](https://tsoauth2server.com/docs/adapters/fastify)
- [H3](https://tsoauth2server.com/docs/adapters/h3)

### Usage

A example using client credentials grant

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  "secret-key",
);
authorizationServer.enableGrantType("client_credentials");

app.post("/token", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
  }
});

app.post("/token/revoke", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.revoke(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
  }
});
```

Example implementations:

- [Simple](./example)
- [Advanced](https://github.com/jasonraimondi/ts-oauth2-server-example)

### Security

| Version         | Latest Version | Security Updates |
|-----------------|----------------|------------------|
| [4.x][version4] | :tada:         | :tada:           |
| [3.x][version3] | :tada:         | :tada:           |
| [2.x][version2] |                | :tada:           |

[version4]: https://github.com/jasonraimondi/ts-oauth2-server/tree/main
[version3]: https://github.com/jasonraimondi/ts-oauth2-server/tree/3.x
[version2]: https://github.com/jasonraimondi/ts-oauth2-server/tree/2.x

## Migration Guide

- [v1 to v2](https://github.com/jasonraimondi/ts-oauth2-server/releases/tag/v2.0.0)
- [v2 to v3](https://tsoauth2server.com/docs/upgrade_guide#to-v3) 
- [v3 to v4](https://tsoauth2server.com/docs/upgrade_guide#to-v4) 

## Thanks

This project is inspired by the [PHP League's OAuth2 Server](https://oauth2.thephpleague.com/). Check out the [PHP League's other packages](https://thephpleague.com/#packages) for some other great PHP projects.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=jasonraimondi/ts-oauth2-server&type=Timeline)](https://star-history.com/#jasonraimondi/ts-oauth2-server&Timeline)
