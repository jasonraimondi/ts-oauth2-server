# Implicit

:::warning Do not use this grant

This library supports the implicit grant, but the grant has security problems. The OAuth 2.0 Security Best Current Practice ([RFC 9700 §2.1.2](https://datatracker.ietf.org/doc/html/rfc9700#section-2.1.2)) tells you not to use it.

For a native application or a single-page application, use the [authorization code grant with PKCE](./authorization_code.md). It gives better security, and the Client does not need a secret.

For a web application with a server, use the authorization code grant. Keep the client secret on your server.

:::

:::info Enable this grant

```ts
authorizationServer.enableGrantType("implicit");
```

:::

## Redirect Mode

By default, the implicit grant adds each token to the redirect URI in a URI fragment. [RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2) recommends this mode.

For an old Client that needs the previous query parameter mode, set `implicitRedirectMode`:

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    implicitRedirectMode: "query",
  },
);
```

| Mode | Redirect Example |
| --- | --- |
| `"fragment"` (default) | `https://example.com/callback#access_token=...&token_type=Bearer` |
| `"query"` | `https://example.com/callback?access_token=...&token_type=Bearer` |

## Resources

- [OAuth 2.0 Implicit Grant](https://oauth.net/2/grant-types/implicit/)
- VIDEO: [What's Going On with the Implicit Flow?](https://www.youtube.com/watch?v=CHzERullHe8) by Aaron Parecki
- [Is the OAuth 2.0 Implicit Flow Dead?](https://developer.okta.com/blog/2019/05/01/is-the-oauth-implicit-flow-dead) by Aaron Parecki (developer.okta.com)
