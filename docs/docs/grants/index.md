---
title: OAuth 2.0 Grants
---


# Grants

A grant is one procedure that a [Client](../Extras/glossary.md#client) uses to get an Access Token. The Access Token then authorizes the Client to use the [resource server](../Extras/glossary.md#resource-server). Select the grant that agrees with the type of your Client.

## Client Credentials Grant

Use this grant when a machine owns the Access Token, for example a server or an application that operates for itself. There is no user, and the Client gets the token with its own credentials.

## Auth Code Grant with PKCE

Use this grant when a user owns the Access Token. The Client redirects the user to the authorization server, the user gives access, and the server returns an authorization code. The Client then exchanges this code for an Access Token. PKCE gives more protection against an attack that intercepts the authorization code.

## Refresh Token Grant

Use this grant when the Client has a Refresh Token. The Client gets a new Access Token, and the user does nothing. This grant is useful for a long session and for a background procedure.

## Which Grant?

```
+-------+
| Start |
+-------+
    V
    |
+------------------------+              +-----------------------+
| Have a refresh token?  |>----Yes----->|  Refresh Token Grant  |
+------------------------+              +-----------------------+
    V
    |
    No
    |
+---------------------+
|     Who is the      |                  +--------------------------+
| Access Token owner? |>---A Machine---->| Client Credentials Grant |
+---------------------+                  +--------------------------+
    V
    |
    |
   A User
    |
    |
+----------------------+
| What type of client? |
+----------------------+
    |
    |                                 +---------------------------+
    |>-----------Server App---------->| Auth Code Grant with PKCE |
    |                                 +---------------------------+
    |
    |                                 +---------------------------+
    |>-------Browser Based App------->| Auth Code Grant with PKCE |
    |                                 +---------------------------+
    |
    |                                 +---------------------------+
    |>-------Native Mobile App------->| Auth Code Grant with PKCE |
                                      +---------------------------+
```
