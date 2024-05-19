# TypeScript OAuth2.0 Server 

[🇺🇦 Support Ukraine 🇺🇦](https://war.ukraine.ua/support-ukraine/)

`@jmondi/oauth2-server` is a standards compliant implementation of an OAuth 2.0 authorization server for Node, written in TypeScript. 

Requires `node >= 18`

Out of the box it supports the following grants:

- [Authorization code grant](https://tsoauth2server.com/grants/authorization_code.html)
- [Client credentials grant](https://tsoauth2server.com/grants/client_credentials.html)
- [Refresh grant](https://tsoauth2server.com/grants/refresh_token.html)
- [Implicit grant](https://tsoauth2server.com/grants/implicit.html) // not recommended 
- [Resource owner password credentials grant](https://tsoauth2server.com/grants/password.html) // not recommended

The following RFCs are implemented:

- [RFC6749 "OAuth 2.0"](https://tools.ietf.org/html/rfc6749)
- [RFC6750 "The OAuth 2.0 Authorization Framework: Bearer Token Usage"](https://tools.ietf.org/html/rfc6750)
- [RFC7009 "OAuth 2.0 Token Revocation"](https://tools.ietf.org/html/rfc7009)
- [RFC7519 "JSON Web Token (JWT)"](https://tools.ietf.org/html/rfc7519)
- [RFC7636 "Proof Key for Code Exchange by OAuth Public Clients"](https://tools.ietf.org/html/rfc7636)
- [RFC8693 "OAuth 2.0 Token Exchange"](https://datatracker.ietf.org/doc/html/rfc8693)
