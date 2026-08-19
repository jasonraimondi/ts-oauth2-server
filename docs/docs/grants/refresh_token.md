
# Refresh Token

Each Access Token expires. With this grant, a Client sends a Refresh Token and gets a new Access Token.

:::info

This grant is enabled by default.

:::

### Flow

A complete refresh token request contains these parameters:

- **grant_type**: Set it to `refresh_token`.
- **client_id**: The identifier that you gave to the Client at registration.
- **client_secret**: The secret. Send it only for a Confidential Client.
- **refresh_token**: The signed Refresh Token that the server issued to the Client.
- **scope** (optional): The requested scopes. They must be the scopes of the first token, or fewer. You cannot add a new scope.

:::: details View sample refresh_token request

::: code-group

```http [Request Body]
POST /token HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=xxxxxxxxx
&client_id=xxxxxxxxx
&client_secret=xxxxxxxxx
&scope="contacts.read contacts.write"
```

```http [Basic Auth]
POST /token HTTP/1.1
Host: example.com
Authorization: Basic Y4NmE4MzFhZGFkNzU2YWRhN
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=xxxxxxxxx
&scope="contacts.read contacts.write"
```

:::
::::

The authorization server returns this response:

- **token_type**: Always `Bearer`.
- **expires_in**: The life of the Access Token, in seconds.
- **access_token**: A signed JWT. The Client sends it to the resource server.
- **refresh_token**: A new signed Refresh Token for the next refresh.
- **scope**: The scopes of the token, separated by spaces.

::: details View sample refresh_token response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Cache-Control: no-store
Pragma: no-cache

{
  token_type: 'Bearer',
  expires_in: 3600,
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MTJhYjlhNC1jNzg2LTQ4YTYtOGFkNi05NGM1M2E4ZGM2NTEiLCJleHAiOjE2MDE3NjcyMTIsIm5iZiI6MTYwMTc2MzYxMiwiaWF0IjoxNjAxNzYzNjEyLCJqdGkiOiJuZXcgdG9rZW4iLCJjaWQiOiJ0ZXN0IGNsaWVudCIsInNjb3BlIjoiIn0.PO4eKSDVsFuKvebEXndWbZsprgzjkzEfHI7cl4N0YpM',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiIzNTYxNWYyZi0xM2ZhLTQ3MzEtODNhMS05ZTM0NTU2YWIzOTAiLCJhY2Nlc3NfdG9rZW5faWQiOiJuZXcgdG9rZW4iLCJyZWZyZXNoX3Rva2VuX2lkIjoidGhpcy1pcy1teS1zdXBlci1zZWNyZXQtcmVmcmVzaC10b2tlbiIsInNjb3BlIjoiIiwidXNlcl9pZCI6IjUxMmFiOWE0LWM3ODYtNDhhNi04YWQ2LTk0YzUzYThkYzY1MSIsImV4cGlyZV90aW1lIjoxNjAxNzY3MjEyLCJpYXQiOjE2MDE3NjM2MTF9.du4KfAzelSA8hzBaqGlrSvPtH-BxOcoUBXW4HS3pJkM',
  scope: 'contacts.read contacts.write'
}
```
:::

### Revocation

A Client can use each Refresh Token one time only. You can also revoke a Refresh Token with the [`/token/revoke`](../endpoints/revoke.md) endpoint, from [RFC 7009 "OAuth 2.0 Token Revocation"](https://tools.ietf.org/html/rfc7009).

A revocation request contains these parameters:

- **token**: The signed Refresh Token that the server issued to the Client.
- **token_type_hint** (optional): Set it to `refresh_token`. The hint is only advisory, because the server identifies the type of the token from the token itself.

::: details View sample revoke refresh_token request
```http
POST /token/revoke HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxx
&token_type_hint=refresh_token
```
:::

The authorization server returns this response:

::: details View sample revoke refresh_token response
```http
HTTP/1.1 200 OK
Cache-Control: no-store
Pragma: no-cache
```
:::
