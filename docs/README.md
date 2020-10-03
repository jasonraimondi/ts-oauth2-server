# @jmondi/oauth2-server

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jasonraimondi/typescript-oauth2-server/Tests?label=tests&style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server)
[![Test Coverage](https://api.codeclimate.com/v1/badges/f70a85595f0a488874e6/test_coverage)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/f70a85595f0a488874e6/maintainability)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/maintainability)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server/releases/latest)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server)

A standards compliant implementation of an OAuth 2.0 authorization server for Node, written in TypeScript.

Requires `node >= 12`

Out of the box it supports the following grants:

- [Authorization code grant](#authorization-code-grant-with-pkce)
- [Implicit grant](#implicit-grant) 
- [Client credentials grant](#client-credentials-grant)
- [Resource owner password credentials grant](#password-grant)
- [Refresh grant](#refresh-token-grant)

The following RFCs are implemented:

- [RFC6749 “OAuth 2.0”](https://tools.ietf.org/html/rfc6749)
- [RFC6750 “ The OAuth 2.0 Authorization Framework: Bearer Token Usage”](https://tools.ietf.org/html/rfc6750)
- [RFC7519 “JSON Web Token (JWT)”](https://tools.ietf.org/html/rfc7519)
- [RFC7636 “Proof Key for Code Exchange by OAuth Public Clients”](https://tools.ietf.org/html/rfc7636)

### Sources

This project was influenced by the [PHP League OAuth2 Server](https://oauth2.thephpleague.com/) and shares a lot of the same ideas.

https://github.com/thephpleague/oauth2-server

https://tools.ietf.org/html/rfc6749#section-4.4

https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/

https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/

https://tools.ietf.org/html/rfc6749#section-4.1 

https://tools.ietf.org/html/rfc7636

https://www.oauth.com/oauth2-servers/pkce/

https://www.oauth.com/oauth2-servers/pkce/authorization-request/

[access_token_response]: https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/ "Access Token Response"

[client_credentials]: https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/ "Client Credentials Grant"
