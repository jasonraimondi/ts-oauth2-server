
# Client Credentials

A Client uses this grant to get an Access Token for its own resources. The Client does not act for a user.

:::info
This grant is enabled by default.
:::

:::warning
Use this grant only with a Confidential Client, because the Client must keep a secret. Do not use it in a browser application or in a native mobile application.
:::

### Flow

The Client sends a **POST** request to the `/token` endpoint with this body:

- **grant_type**: Set it to `client_credentials`.
- **client_id**: The identifier that you gave to the Client at registration.
- **client_secret**: The secret of the Client.
- **scope**: The requested scopes, separated by spaces. The Client must have permission for each scope.

:::: details View sample client_credentials request

Send the `client_id` and the `client_secret` in the request body, or use basic authentication.

::: code-group

```http [Request Body]
POST /token HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=xxxxxxxxxx
&client_secret=xxxxxxxxxx
&scope="contacts.read contacts.write"
```

```http [Basic Auth]
POST /token HTTP/1.1
Host: example.com
Authorization: Basic MTpzdXBlci1zZWNyZXQtc2VjcmV0

grant_type=client_credentials
&scope="contacts.read contacts.write"
```

:::
::::

The authorization server returns this response:

- **token_type**: Always `Bearer`.
- **expires_in**: The life of the Access Token, in seconds.
- **access_token**: A signed JWT. The Client sends it to the resource server.
- **scope**: The scopes of the token, separated by spaces.

::: details View sample client_credentials response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Cache-Control: no-store
Pragma: no-cache

{
  token_type: 'Bearer',
  expires_in: 3600,
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDE3MDY0NjYsIm5iZiI6MTYwMTcwMjg2NiwiaWF0IjoxNjAxNzAyODY2LCJqdGkiOiJuZXcgdG9rZW4iLCJjaWQiOiJ0ZXN0IGNsaWVudCIsInNjb3BlIjoiIn0.KcXoCP6u9uhvtOoistLBskESA0tyT2I1SDe5Yn9iM4I',
  scope: 'contacts.read contacts.write'
}
```
:::
