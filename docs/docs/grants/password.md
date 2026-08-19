
# Password

:::warning Do not use this grant

This library supports the password grant, but the grant insecurely exposes the credentials of the user to the Client. The OAuth 2.0 Security Best Current Practice ([RFC 9700 §2.4](https://datatracker.ietf.org/doc/html/rfc9700#section-2.4)) says it MUST NOT be used.

Use the [authorization code grant with PKCE](./authorization_code.md) instead. The library keeps this grant only so an old first-party Client can migrate.

:::

:::info Enable this grant

```ts
authorizationServer.enableGrantType({
  grant: "password",
  userRepository,
});
```

:::

### Flow

A complete password grant request contains these parameters:

- **grant_type**: Set it to `password`.
- **client_id**: The identifier that you gave to the Client at registration.
- **client_secret**: The secret. Send it only for a Confidential Client.
- **username**: The name of the user.
- **password**: The password of the user.
- **scope** (optional): The requested scopes, separated by spaces.

:::: details View sample password grant request

::: code-group

```http [Request Body]
POST /token HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

grant_type=password
&client_id=xxxxxxxxx
&client_secret=xxxxxxxxx
&username=xxxxxxxxx
&password=xxxxxxxxx
&scope="contacts.read contacts.write"
```

```http [Basic Auth]
POST /token HTTP/1.1
Host: example.com
Authorization: Basic Y4NmE4MzFhZGFkNzU2YWRhN

grant_type=password
&username=xxxxxxxxx
&password=xxxxxxxxx
&scope="contacts.read contacts.write"
```

:::
::::

The authorization server returns this response:

- **token_type**: Always `Bearer`.
- **expires_in**: The life of the Access Token, in seconds.
- **access_token**: A signed JWT. The Client sends it to the resource server.
- **refresh_token**: A signed JWT for the [refresh token grant](./refresh_token.md).
- **scope**: The scopes of the token, separated by spaces.

::: details View sample password grant response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Cache-Control: no-store
Pragma: no-cache

{
  token_type: 'Bearer',
  expires_in: 3600,
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MTJhYjlhNC1jNzg2LTQ4YTYtOGFkNi05NGM1M2E4ZGM2NTEiLCJleHAiOjE2MDE3NjcyOTksIm5iZiI6MTYwMTc2MzY5OSwiaWF0IjoxNjAxNzYzNjk5LCJqdGkiOiJuZXcgdG9rZW4iLCJjaWQiOiJ0ZXN0IGNsaWVudCIsInNjb3BlIjoiIn0.sX6SWc2Af8jn-izFnrLgNIcNuZz_tRLl2p7M3CzQwKg',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiIzNTYxNWYyZi0xM2ZhLTQ3MzEtODNhMS05ZTM0NTU2YWIzOTAiLCJhY2Nlc3NfdG9rZW5faWQiOiJuZXcgdG9rZW4iLCJyZWZyZXNoX3Rva2VuX2lkIjoidGhpcy1pcy1teS1zdXBlci1zZWNyZXQtcmVmcmVzaC10b2tlbiIsInNjb3BlIjoiIiwidXNlcl9pZCI6IjUxMmFiOWE0LWM3ODYtNDhhNi04YWQ2LTk0YzUzYThkYzY1MSIsImV4cGlyZV90aW1lIjoxNjAxNzY3Mjk5LCJpYXQiOjE2MDE3NjM2OTh9.SSa7miIdk3bxyzg0f3M9jKBXWjPgD4QEw-AU3SYvBk0',
  scope: 'contacts.read contacts.write'
}
```
:::
