---
title: OIDC Hooks
---

# OIDC Hooks

The OIDC layer has two callbacks for you. They look the same, but they do different work.

## Which Hook Do I Use?

| | `getUserClaims` | `getIdTokenClaims` |
| --- | --- | --- |
| **Required?** | Yes. It is part of the `oidc` block | No. It is optional |
| **Supplies** | The [UserInfo](../endpoints/userinfo.md) response | The payload of the ID Token |
| **Use it for** | A Scope-Derived Claim, such as `name`, `email`, or `address` | Your own claim, such as `roles`, `tenant`, or `acr` |
| **Filter** | The library removes each claim that the granted scopes do not permit (OIDC Core §5.4) | The library adds your claims, but removes each Protocol Claim |
| **The server calls it** | At each UserInfo request | One time, when the server makes an ID Token at `/token` |
| **The `sub` claim** | The library always replaces `sub` with the canonical subject | You cannot change `sub` or the other Protocol Claims |

**Rule:** If a claim gives the profile of the user, and a Client can read it when necessary, use `getUserClaims`. If a claim must go in the ID Token, so that a Client reads it with no second request, use `getIdTokenClaims`.

## `getUserClaims`

This callback returns the attributes of the end-user for UserInfo, for one subject. Return each attribute that you hold. The library then removes the claims that the granted scopes do not permit, and writes the canonical `sub`.

```ts
oidc: {
  // ...
  getUserClaims: async subject => {
    const user = await db.users.findById(subject);
    return {
      sub: subject,
      name: user.name,
      email: user.email,
      email_verified: user.emailVerified,
    };
  },
}
```

If the server does not grant the `email` scope, it removes `email` and `email_verified` from the response.

## `getIdTokenClaims`

This callback adds your own claims to the ID Token. The default ID Token holds Protocol Claims only. The callback lets you add more claims, but it does not let you damage the token.

```ts
oidc: {
  // ...
  getIdTokenClaims: async ({ subject, clientId, scopes }) => {
    const roles = await db.roles.forUser(subject);
    return { roles, tenant: "acme" };
  },
}
```

The context is `{ subject, clientId, scopes }`. It also has an index signature for the future fields.

:::warning A Protocol Claim always wins
The library removes the eight Protocol Claims from the value that your callback returns, and then adds the remainder. These claims are `iss`, `sub`, `aud`, `exp`, `iat`, `at_hash`, `nonce`, and `auth_time`. The library exports the list as `PROTOCOL_CLAIM_NAMES`. Thus a callback that returns `{ nonce, roles }` cannot change the protocol `nonce`.

Your claims go in the JWT **payload** only. They never go in the JOSE header, and thus they cannot change the signing algorithm or the `kid`.

If your callback throws, the server reports `invalid_grant`. It does not hide the error, and thus you see each mistake.
:::
