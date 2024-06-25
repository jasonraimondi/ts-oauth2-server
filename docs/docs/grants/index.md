---
title: Grants
sidebar_position: 3
---

# Which Grant?

Grants are different ways a [client](../misc/glossary/index.md#client) can obtain an `access_token` that will authorize
it to use the [resource server](../misc/glossary/index.md#resource-server).

Deciding which grant to use depends on the type of client the end user will be using.

```
+-------+
| Start |
+-------+
    |
    V
+------------------------+
| Have a refresh token?  |
+------------------------+
    |
    +-----No-------------------+
    |                          |
    V                          V
+---------------------+    +------------------------+
|     Who is the      |    |  Refresh Token Grant   |
| access token owner? |    | (Use refresh token to  |
+---------------------+    |  get new access token) |
    |                      +------------------------+
    |
    +-----A Machine-----+
    |                   |
    V                   V
+----------------------+    +---------------------------+
| What type of client? |    | Client Credentials Grant  |
+----------------------+    | (For machine-to-machine   |
    |                       |     communication)        |
    |                       +---------------------------+
    |
    +-----Server App--------+
    |                       |
    +-----Browser-based-----+    +---------------------------+
    |       App             +--->| Authorization Code Grant  |
    |                       |    |         with PKCE         |
    +-----Native Mobile-----+    | (More secure, supports    |
            App                  |  public clients)          |
                                 +---------------------------+

Notes:
1. Always use HTTPS for all OAuth 2.0 interactions
2. For public clients (browser-based and mobile apps), always use PKCE
3. Securely store tokens and other sensitive information
4. Implement proper token validation and revocation
5. Consider using OpenID Connect for authentication on top of OAuth 2.0
```

### Refresh Token Grant

If the client already has a refresh token, it can use the Refresh Token Grant to obtain a new access token without requiring the user's interaction. This grant is useful for long-lived sessions and background processes.

### Client Credentials Grant

If the access token owner is a machine, such as a server or an application acting on its own behalf, rather than an individual user, the client can use the Client Credentials Grant. This grant is designed for scenarios where the client needs to access resources autonomously without the context of a specific user.

### Auth Code Grant with PKCE

If the access token owner is a user, the recommended grant is the Authorization Code Grant with Proof Key for Code Exchange (PKCE). This grant involves a series of steps where the client redirects the user to the authorization server, the user grants access, and the server provides an authorization code that the client exchanges for an access token. PKCE adds an extra layer of security to protect against authorization code interception attacks.
