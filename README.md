# TypeScript OAuth2.0 Server

[![JSR](https://jsr.io/badges/@jmondi/oauth2-server)](https://jsr.io/@jmondi/oauth2-server)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jasonraimondi/ts-oauth2-server?style=flat-square)](https://github.com/jasonraimondi/ts-oauth2-server/releases/latest)
[![GitHub Workflow Status]( https://img.shields.io/github/actions/workflow/status/jasonraimondi/ts-oauth2-server/build-and-test.yml?branch=main&style=flat-square)](https://github.com/jasonraimondi/ts-oauth2-server)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

`@jmondi/oauth2-server` is a standards compliant implementation of an OAuth 2.0 authorization server written in TypeScript. 

Requires `node >= 18`. [Read the docs](https://tsoauth2server.com/)

The following RFCs are implemented:

- [RFC6749 "OAuth 2.0"](https://tools.ietf.org/html/rfc6749)
- [RFC6750 "The OAuth 2.0 Authorization Framework: Bearer Token Usage"](https://tools.ietf.org/html/rfc6750)
- [RFC7009 "OAuth 2.0 Token Revocation"](https://tools.ietf.org/html/rfc7009)
- [RFC7519 "JSON Web Token (JWT)"](https://tools.ietf.org/html/rfc7519)
- [RFC7636 "Proof Key for Code Exchange by OAuth Public Clients"](https://tools.ietf.org/html/rfc7636)
- [RFC7662 "OAuth 2.0 Token Introspection"](https://tools.ietf.org/html/rfc7662)
- [RFC8693 "OAuth 2.0 Token Exchange"](https://datatracker.ietf.org/doc/html/rfc8693)

Out of the box it supports the following grants:

- [Authorization code grant](https://tsoauth2server.com/docs/grants/authorization_code)
- [Client credentials grant](https://tsoauth2server.com/docs/grants/client_credentials)
- [Refresh grant](https://tsoauth2server.com/docs/grants/refresh_token)
- [Implicit grant](https://tsoauth2server.com/docs/grants/implicit) // not recommended 
- [Resource owner password credentials grant](https://tsoauth2server.com/docs/grants/password) // not recommended

Framework support:

The included adapters are just helper functions, any framework should be supported. Take a look at the adapter implementations to learn how you can create custom adapters for your favorite tool!

- [VanillaJS](https://tsoauth2server.com/docs/adapters/vanilla)
- [Express](https://tsoauth2server.com/docs/adapters/express)
- [Fastify](https://tsoauth2server.com/docs/adapters/fastify). 

Example implementations:

- [Simple](./example)
- [Advanced](https://github.com/jasonraimondi/ts-oauth2-server-example)

### Security

| Version         | Latest Version | Security Updates |
|-----------------|----------------|------------------|
| [4.x][version4] | :tada:         | :tada:           |
| [3.x][version3] | :tada:         | :tada:           |
| [2.x][version2] |                | :tada:           |

[version3]: https://github.com/jasonraimondi/ts-oauth2-server/tree/main
[version2]: https://github.com/jasonraimondi/ts-oauth2-server/tree/2.x

## Migration Guide

- [v1 to v2](https://github.com/jasonraimondi/ts-oauth2-server/releases/tag/v2.0.0)
- [v2 to v3](https://tsoauth2server.com/migration/v2_to_v3.html) 

## Thanks

This project is inspired by the [PHP League's OAuth2 Server](https://oauth2.thephpleague.com/). Check out the [PHP League's other packages](https://thephpleague.com/#packages) for some other great PHP projects.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=jasonraimondi/ts-oauth2-server&type=Timeline)](https://star-history.com/#jasonraimondi/ts-oauth2-server&Timeline)
