---
sidebar_position: 4
---

# Database Schema Reference

This page provides SQL schema examples for implementing the required entities. The library is database-agnostic, but most implementations use a relational database.

:::danger Security Critical

**Before implementing, read the [Security Considerations](#security-considerations) section.** Failing to hash secrets and tokens can lead to catastrophic security breaches.

:::

## Security Considerations

### Hash Client Secrets

**Never store client secrets in plaintext.** Per RFC6749 Section 2.3.1, client credentials must be protected.

```sql
-- The 'secret' column should contain a bcrypt/argon2 hash, NOT the raw secret
-- Example hash: $2b$10$X7o4c5/QyOxCz...
```

Your `OAuthClientRepository.isClientValid()` must use secure hash comparison:

```typescript
import { compare } from "bcrypt";

async isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean> {
  if (!client.allowedGrants.includes(grantType)) {
    return false;
  }

  if (client.secret && clientSecret) {
    return compare(clientSecret, client.secret); // Secure hash comparison
  }

  return !client.secret; // Public client (no secret required)
}
```

### Consider Hashing Refresh Tokens

Refresh tokens are long-lived credentials. If your database is compromised, plaintext refresh tokens allow attackers to generate new access tokens indefinitely.

Consider storing a hash of the refresh token and using constant-time comparison during validation.

### Use TLS for Database Connections

Always use encrypted connections (TLS/SSL) between your application and database in production.

---

## Recommended Schema (Normalized)

This schema uses pivot tables for many-to-many relationships (scopes). This approach provides:

- Referential integrity
- Easier auditing ("which clients have admin scope?")
- Standard SQL queries for access control

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
```

### Scopes Table

```sql
CREATE TABLE oauth_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_scopes_name ON oauth_scopes(name);
```

### Clients Table

```sql
CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    secret VARCHAR(255), -- NULL for public clients; MUST be hashed for confidential clients
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    allowed_grants VARCHAR(50)[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Valid grant types: 'authorization_code', 'client_credentials', 'refresh_token',
-- 'password', 'implicit', 'urn:ietf:params:oauth:grant-type:token-exchange'
```

### Client Scopes (Pivot Table)

```sql
CREATE TABLE oauth_client_scopes (
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (client_id, scope_id)
);

CREATE INDEX idx_oauth_client_scopes_client ON oauth_client_scopes(client_id);
CREATE INDEX idx_oauth_client_scopes_scope ON oauth_client_scopes(scope_id);
```

### Authorization Codes Table

```sql
CREATE TYPE code_challenge_method AS ENUM ('S256', 'plain');

CREATE TABLE oauth_auth_codes (
    code VARCHAR(255) PRIMARY KEY,
    redirect_uri TEXT,
    code_challenge VARCHAR(255),
    code_challenge_method code_challenge_method,
    expires_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ -- For revocation support
);

CREATE INDEX idx_oauth_auth_codes_client ON oauth_auth_codes(client_id);
CREATE INDEX idx_oauth_auth_codes_user ON oauth_auth_codes(user_id);
CREATE INDEX idx_oauth_auth_codes_expires ON oauth_auth_codes(expires_at);
```

### Authorization Code Scopes (Pivot Table)

```sql
CREATE TABLE oauth_auth_code_scopes (
    auth_code VARCHAR(255) NOT NULL REFERENCES oauth_auth_codes(code) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    PRIMARY KEY (auth_code, scope_id)
);

CREATE INDEX idx_oauth_auth_code_scopes_code ON oauth_auth_code_scopes(auth_code);
```

### Tokens Table

```sql
CREATE TABLE oauth_tokens (
    access_token VARCHAR(255) PRIMARY KEY,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    refresh_token_expires_at TIMESTAMPTZ,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    originating_auth_code_id VARCHAR(255), -- For RFC6749 §4.1.2 compliance
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ -- For revocation support (RFC7009)
);

CREATE INDEX idx_oauth_tokens_access_token ON oauth_tokens(access_token);
CREATE INDEX idx_oauth_tokens_refresh_token ON oauth_tokens(refresh_token);
CREATE INDEX idx_oauth_tokens_client ON oauth_tokens(client_id);
CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_auth_code ON oauth_tokens(originating_auth_code_id);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(access_token_expires_at);
```

### Token Scopes (Pivot Table)

```sql
CREATE TABLE oauth_token_scopes (
    access_token VARCHAR(255) NOT NULL REFERENCES oauth_tokens(access_token) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    PRIMARY KEY (access_token, scope_id)
);

CREATE INDEX idx_oauth_token_scopes_token ON oauth_token_scopes(access_token);
```

---

## Alternative: Simplified Schema (Array-Based)

For simpler deployments, you can store scopes as arrays directly on entities. This reduces table count but sacrifices referential integrity.

:::warning Tradeoffs

- No foreign key validation on scope names (typos fail silently)
- Harder to query "all clients with scope X"
- No cascade delete when removing scopes

:::

```sql
-- Users table (same as normalized schema)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Enum for PKCE (same as normalized schema)
CREATE TYPE code_challenge_method AS ENUM ('S256', 'plain');

-- Scopes stored as TEXT[] instead of pivot tables
CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    secret VARCHAR(255),
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    allowed_grants VARCHAR(50)[] NOT NULL DEFAULT '{}',
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array instead of pivot table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_auth_codes (
    code VARCHAR(255) PRIMARY KEY,
    redirect_uri TEXT,
    code_challenge VARCHAR(255),
    code_challenge_method code_challenge_method,
    expires_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array instead of pivot table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_tokens (
    access_token VARCHAR(255) PRIMARY KEY,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    refresh_token_expires_at TIMESTAMPTZ,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array instead of pivot table
    originating_auth_code_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Query scopes using ANY()
-- Example: SELECT * FROM oauth_clients WHERE 'admin' = ANY(scopes);
```

---

## Token Revocation Support (RFC7009)

To support the `/revoke` endpoint, add a `revoked_at` timestamp column:

```sql
-- Check if token is revoked in your repository
SELECT * FROM oauth_tokens
WHERE access_token = $1
  AND revoked_at IS NULL;

-- Revoke a token
UPDATE oauth_tokens
SET revoked_at = NOW()
WHERE access_token = $1;

-- Revoke all tokens from an auth code (RFC6749 §4.1.2)
UPDATE oauth_tokens
SET revoked_at = NOW()
WHERE originating_auth_code_id = $1;
```

---

## Existing Examples

For ORM-based implementations, see these existing examples:

- **Prisma Schema**: [example/prisma/schema.prisma](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/example/prisma/schema.prisma)
- **Full Example App**: [ts-oauth2-server-example](https://github.com/jasonraimondi/ts-oauth2-server-example) with Prisma schema and migrations

---

## Verify Your Implementation

After implementing your schema, verify these security requirements:

| Check | How to Verify |
|-------|---------------|
| Secrets are hashed | `SELECT secret FROM oauth_clients` shows bcrypt hashes (starting with `$2b$`) |
| Referential integrity | Deleting a client cascades to tokens and auth codes |
| Token expiry indexed | `EXPLAIN` shows index usage on expiry queries |
| Revocation works | Revoked tokens return `is_revoked = true` from repository |