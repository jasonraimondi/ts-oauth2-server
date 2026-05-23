---
title: OIDC Hooks
---

# OIDC Hooks

OIDC exposes two consumer callbacks. They look similar but answer different questions, and choosing the wrong one is a common source of confusion.

## Which hook do I use?

| | `getUserClaims` | `getIdTokenClaims` |
| --- | --- | --- |
| **Required?** | Yes (part of the `oidc` block) | No (optional) |
| **Feeds** | The [UserInfo](../endpoints/userinfo.md) response | The issued **ID token** payload |
| **Use for** | Scope-derived profile claims (`name`, `email`, `address`, …) | Custom protocol-adjacent claims (`roles`, `tenant`, `acr`, …) |
| **Filtering** | Output is filtered to what the **granted scopes** permit (OIDC Core §5.4) | Output is merged as-is, minus reserved protocol claims |
| **Called** | On each UserInfo request | Once, when an ID token is minted at `/token` |
| **`sub` handling** | `sub` is always overwritten with the canonical subject | `sub` (and the other protocol claims) cannot be overwritten |

**Rule of thumb:** if a claim describes the user's profile and should be fetched on demand, put it behind `getUserClaims`. If a claim must travel inside the ID token (so the relying party sees it without a UserInfo round trip), use `getIdTokenClaims`.

## `getUserClaims`

Required. Resolves the end-user's attributes for UserInfo, keyed by the OIDC subject. Return whatever you hold; the library filters to the granted scopes and forces the canonical `sub`.

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

If the `email` scope was not granted, `email`/`email_verified` are stripped from the response automatically.

## `getIdTokenClaims`

Optional. Adds custom claims to the ID token. The default ID token stays lean (protocol claims only); this hook removes the hard wall without letting a consumer corrupt the token.

```ts
oidc: {
  // ...
  getIdTokenClaims: async ({ subject, clientId, scopes }) => {
    const roles = await db.roles.forUser(subject);
    return { roles, tenant: "acme" };
  },
}
```

The context is `{ subject, clientId, scopes }` (plus a forward-compatible index signature).

:::warning Protocol claims always win
The eight reserved protocol claims — `iss`, `sub`, `aud`, `exp`, `iat`, `at_hash`, `nonce`, `auth_time` (exported as `PROTOCOL_CLAIM_NAMES`) — are stripped from the hook's return value before merging, so a hook returning `{ nonce, roles }` cannot overwrite the protocol `nonce`. Hook output reaches the JWT **payload** only — never the JOSE header, so it cannot influence the signing algorithm or `kid`. A hook that **throws** surfaces as `invalid_grant` rather than being swallowed, so consumer mistakes are visible.
:::
