---
title: Keypair Lifecycle
---

# Keypair Lifecycle

OIDC mandates **RS256**, so the `JwtService` must be constructed with an RSA key pair rather than a shared HMAC secret. The private key signs access tokens and ID tokens; the matching public key is published at the [JWKS endpoint](../endpoints/discovery.md) so relying parties can verify them.

## Generating a key pair

### With openssl

```bash
# 2048-bit RSA private key (PKCS#8 PEM)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out oidc_private.pem

# Optional: derive the public key (the server derives this for you from the private key)
openssl rsa -in oidc_private.pem -pubout -out oidc_public.pem
```

### With Node's `generateKeyPairSync`

```ts
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
// Persist `pem` to your secret store — do not regenerate on boot (see below).
```

## PEM vs KeyObject

`JwtService` accepts either form for the `key` option:

```ts
import { JwtService } from "@jmondi/oauth2-server";

// PEM string (e.g. loaded from an env var or secret manager)
new JwtService({ key: process.env.RSA_PRIVATE_KEY_PEM });

// Node KeyObject (e.g. from generateKeyPairSync or createPrivateKey)
import { createPrivateKey } from "node:crypto";
new JwtService({ key: createPrivateKey(process.env.RSA_PRIVATE_KEY_PEM) });
```

A PEM is convenient to store and transport; a `KeyObject` avoids re-parsing the PEM on every operation. Both produce the same `kid` — an [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) thumbprint — so the JWKS `kid` stays stable across restarts as long as the key bytes are stable.

:::danger Do not generate the key on boot
Generating a fresh key pair at startup invalidates **every** previously issued token and rotates the `kid` on each restart, breaking relying parties mid-session. Generate the key **once**, store it in a secret manager (or an env var injected at deploy time), and load the same key on every boot. The keys in this documentation are generated inline only because the examples are throwaway.
:::

## Storing the key

- Keep the private key in a secret manager (AWS Secrets Manager, GCP Secret Manager, Vault) or an injected environment variable — never commit it.
- Only the **public** key is exposed, and only through the JWKS endpoint.
- The JWKS response is cacheable (`Cache-Control: public, max-age=3600`); relying parties refetch it when they see an unknown `kid`.

## Multi-key rotation

v1 is a **single-key** model: one active RSA key, one entry in the JWKS. Rotating the key today means a hard cutover — issue with the new key, and tokens signed by the old key stop verifying once the old key is no longer published.

True overlapping rotation (publishing multiple keys in the JWKS so old and new tokens both verify during a grace window) and ES256 support are a forward-looking change tracked for a future major version. Design your deployment so the key can be swapped via configuration, and prefer short access-token lifetimes to shrink the cutover window.
