---
sidebar_position: 6
---

# Token Exchange Grant

The [RFC 8693 - OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) facilitates the secure exchange of tokens for accessing different resources or services. This documentation guides you through enabling this grant type on your authorization server, detailing request and response handling to ensure robust and secure token management.

:::note Enable this grant

To enable the token exchange grant, you'll need to provide your own implementation of `processTokenExchangeFn`. This function should orchestrate the exchange with the required third-party services based on your specific needs.

```ts
authorizationServer.enableGrant({
  grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
  processTokenExchangeFn: async (
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

The client sends a **POST** to the `/token` endpoint with the following body:

- **grant_type** must be set to `urn:ietf:params:oauth:grant-type:token-exchange`
- **client_id** is the client identifier you received when you first created the application
- **subject_token** a security token that represents the identity of the party on behalf of whom the request is being made
- **subject_token_type** an identifier, as described in Section 3, that indicates the type of the security token in the subject_token parameter [See more info](https://datatracker.ietf.org/doc/html/rfc8693#TokenTypeIdentifiers)
- **actor_token** (_optional_) a security token that represents the identity of the acting party
- **actor_token_type** (_optional but required when actor_token is present_) an identifier that indicates the type of the security token in the actor_token parameter [See more info](https://datatracker.ietf.org/doc/html/rfc8693#TokenTypeIdentifiers)
- **resource** (_optional_) a URI that indicates the target service or resource where the client intends to use the requested security token.
- **audience** (_optional_) is the logical name of the target service where the client intends to use the requested security token.
- **requested_token_type** (_optional_) is an identifier for the type of the requested security token [See more info](https://datatracker.ietf.org/doc/html/rfc8693#TokenTypeIdentifiers)
- **scope** (_optional_) is a string with a space delimited list of requested scopes. The requested scopes must be valid for the client.

<details>
  <summary>View sample request</summary>
  _Did you know?_ You can authenticate by passing the `client_id` and `client_secret` as a query string, or through basic auth.

```http request [Query String]
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

</details>

The authorization server will respond with the following response.

- **token_type** will always be `Bearer`
- **expires_in** is the time the token will live in seconds
- **access_token** is a JWT signed token and can be used to authenticate into the resource server
- **scope** is a space delimited list of scopes the token has access to

<details>
  <summary>View sample response</summary>
  ```http request
  HTTP/1.1 200 OK
  Content-Type: application/json; charset=UTF-8
  Cache-Control: no-store
  Pragma: no-cache

{
token_type: 'Bearer',
expires_in: 3600,
access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDE3MDY0NjYsIm5iZiI6MTYwMTcwMjg2NiwiaWF0IjoxNjAxNzAyODY2LCJqdGkiOiJuZXcgdG9rZW4iLCJjaWQiOiJ0ZXN0IGNsaWVudCIsInNjb3BlIjoiIn0.KcXoCP6u9uhvtOoistLBskESA0tyT2I1SDe5Yn9iM4I',
scope: 'contacts.create contacts.read'
}

```
</details>
```
