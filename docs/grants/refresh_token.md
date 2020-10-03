# Refresh Token Grant

Access tokens eventually expire. The refresh token grant enables the client to obtain a new access_token from an existing refresh_token.

### Flow

A complete refresh token request will include the following parameters:

- **grant_type** must be set to `refresh_token`
- **client_id** is the client identifier you received when you first created the application
- **client_secret** if the client is confidential (has a secret), this must be provided
- **refresh_token** must be the signed token previously issued to the client
- **scope** (optional) the requested scope must not include any additional scopes that were not previously issued to the original token

::: details View sample refresh_token request
```http request
POST /token HTTP/1.1
Host: example.com
Authorization: Basic Y4NmE4MzFhZGFkNzU2YWRhN
 
grant_type=refresh_token
&refresh_token=xxxxxxxxx
&client_id=xxxxxxxxx
&client_secret=xxxxxxxxx
&scope="contacts.read contacts.write"
```
:::

The authorization server will respond with the following response

- **token_type** will always be `Bearer`
- **expires_in** is the time the token will live in seconds
- **access_token** is a JWT signed token and is used to authenticate into the resource server
- **refresh_token** is a JWT signed token and can be used in with the [refresh grant](#refresh-token-grant) 
- **scope** is a space delimited list of scopes the token has access to

::: details View sample refresh_token response
```http request
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
