---
title: Keypair Lifecycle
---

# Keypair Lifecycle

OIDC makes **RS256** mandatory. Thus you must give your `JwtService` an RSA key pair, and not a shared HMAC secret. The private key signs each Access Token and each ID Token. The server publishes the public key at the [JWKS endpoint](./getting_started.md#add-the-endpoints), and each Client verifies the signatures with it.

## Make a Key Pair

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

## PEM or KeyObject

The `JwtService` accepts the `key` option in two forms:

```ts
import { JwtService } from "@jmondi/oauth2-server";

// PEM string (e.g. loaded from an env var or secret manager)
new JwtService({ key: process.env.RSA_PRIVATE_KEY_PEM! });

// Node KeyObject (e.g. from generateKeyPairSync or createPrivateKey)
import { createPrivateKey } from "node:crypto";
new JwtService({ key: createPrivateKey(process.env.RSA_PRIVATE_KEY_PEM!) });
```

A PEM is easy to store and to transport. A `KeyObject` is faster, because the server does not read the PEM again at each operation. The two forms give the same `kid`, which is an [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) thumbprint. Thus the `kid` in the JWKS stays the same after a restart, while the key stays the same.

:::danger Do not make a new key at each start
A new key pair at each start makes **every** previous token invalid, and it changes the `kid`. This stops each Client in the middle of its session.

Make the key one time. Store it in a secret manager, or in an environment variable that your deployment supplies. Then load the same key at each start. The examples on this page make a key inline, because they are only examples.
:::

## Store the Key

- Keep the private key in a secret manager, such as AWS Secrets Manager, GCP Secret Manager, or Vault. An environment variable is also correct. Never commit the key.
- The server publishes the **public** key only, and only at the JWKS endpoint.
- A Client can cache the JWKS response, because it has `Cache-Control: public, max-age=3600`. A Client reads the JWKS again when it finds an unknown `kid`.

## Multi-Key Rotation

Version 1 uses **one key**: one active RSA key, and one entry in the JWKS. Thus you change the key in one step. The server signs with the new key, and each token from the old key becomes invalid when you remove the old key.

A future major version adds two things: more keys in the JWKS, so that an old token and a new token both verify for a period; and support for ES256. Until then, make your key easy to change through your configuration. Also keep the life of each Access Token short, which makes the change period shorter.
