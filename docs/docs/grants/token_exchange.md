# Token Exchange

With [RFC 8693 - OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693), a Client exchanges one security token for a different one. The new token gives access to a different resource or service.

:::info Enable this grant

You must write your own `processTokenExchange` function. This function does the exchange with the third-party services that you use.

```ts
authorizationServer.enableGrantType({
  grant: "urn:ietf:params:oauth:grant-type:token-exchange",
  processTokenExchange: async (
    args: ProcessTokenExchangeArgs,
  ): Promise<OAuthUser | undefined> => {
    const {
      resource,
      audience,
      scopes,
      requestedTokenType,
      subjectToken,
      subjectTokenType,
      actorToken,
      actorTokenType,
    } = args;

    // Implement the logic to handle the token exchange.
    // This could involve validating the subject token, interacting with third-party services,
    // and generating or retrieving an appropriate access token for the user.
    // Example:
    const user = await exchangeTokenForUser(subjectToken, subjectTokenType);

    // Return the user object associated with the exchanged token, or undefined if exchange fails
    return user;
  },
});
```

:::

### Flow

The Client sends a **POST** request to the `/token` endpoint with this body:

- **grant_type**: Set it to `urn:ietf:params:oauth:grant-type:token-exchange`.
- **client_id**: The identifier that you gave to the Client at registration.
- **subject_token**: A security token. It identifies the party that the Client acts for.
- **subject_token_type**: The type of the `subject_token`. [RFC 8693 §3](https://datatracker.ietf.org/doc/html/rfc8693#TokenTypeIdentifiers) lists the standard values. The server accepts any `urn:…:oauth:token-type:…` identifier.
- **actor_token** (_optional_): A security token. It identifies the party that does the action.
- **actor_token_type** (_required with `actor_token`_): The type of the `actor_token`. [RFC 8693 §3](https://datatracker.ietf.org/doc/html/rfc8693#TokenTypeIdentifiers) lists the standard values.
- **resource** (_optional_): The URI of the service or the resource where the Client uses the new token.
- **audience** (_optional_): The name of the service where the Client uses the new token.
- **requested_token_type** (_optional_): The type of token that the Client requests. [RFC 8693 §3](https://datatracker.ietf.org/doc/html/rfc8693#TokenTypeIdentifiers) lists the standard values.
- **scope** (_optional_): The requested scopes, separated by spaces. The Client must have permission for each scope.

::: details View sample request
Send the Client credentials in the request body, or use basic authentication.

```http
POST /token HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&client_id=ec6875c5-407a-4242-947a-1ab5e6ad632f
&requested_token_type=urn:ietf:params:oauth:token-type:access_token
&subject_token={steam_session_id}
&subject_token_type=urn:ietf:oauth:token-type:steam_session_ticket
&scope="contacts.read contacts.write"
```
:::

The authorization server returns this response:

- **token_type**: Always `Bearer`.
- **expires_in**: The life of the Access Token, in seconds.
- **access_token**: A signed JWT. The Client sends it to the resource server.
- **scope**: The scopes of the token, separated by spaces.

::: details View sample response
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
