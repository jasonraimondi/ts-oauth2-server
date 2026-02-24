---
sidebar_position: 8
---

# Implicit Grant ⚠️ ⚠️

:::warning Not Recommended

This server supports the Implicit Grant, but its use is strongly discouraged due to security concerns. The OAuth 2.0 Security Best Current Practice (RFC 8252) recommends against using the Implicit Grant flow.

For native and single-page applications, the recommended approach is to use the Authorization Code Grant with PKCE (Proof Key for Code Exchange) extension. This method provides better security without requiring a client secret.

If you're developing a web application with a backend, consider using the standard Authorization Code Grant with a client secret stored securely on your server.

:::

## Redirect Mode

By default, the implicit grant appends tokens to the redirect URI using query parameters for backwards compatibility. [RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2) recommends using URI fragments instead.

:::caution

In the next major version, the default will change from `"query"` to `"fragment"` to align with RFC 6749. To prepare, explicitly set `implicitRedirectMode: "query"` if you depend on the current behavior.

:::

To enable fragment mode:

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    implicitRedirectMode: "fragment",
  },
);
```

| Mode | Redirect Example |
| --- | --- |
| `"query"` (default) | `https://example.com/callback?access_token=...&token_type=Bearer` |
| `"fragment"` | `https://example.com/callback#access_token=...&token_type=Bearer` |

## Resources

Please look at these great resources:

- [OAuth 2.0 Implicit Grant](https://oauth.net/2/grant-types/implicit/)
- VIDEO: [What's Going On with the Implicit Flow?](https://www.youtube.com/watch?v=CHzERullHe8) by Aaron Parecki
- [Is the OAuth 2.0 Implicit Flow Dead?](https://developer.okta.com/blog/2019/05/01/is-the-oauth-implicit-flow-dead) by Aaron Parecki (developer.okta.com)
