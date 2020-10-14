# TypeScript OAuth 2.0 Server
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jasonraimondi/typescript-oauth2-server/build%20and%20test?label=tests&style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage)
[![Maintainability](https://img.shields.io/codeclimate/coverage-letter/jasonraimondi/typescript-oauth2-server?label=maintainability&style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/maintainability)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server/releases/latest)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

`@jmondi/oauth2-server` is a standards compliant implementation of an OAuth 2.0 authorization server for Node, written in TypeScript. 

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

### [See Documentation](https://jasonraimondi.github.io/typescript-oauth2-server/)


**@TODO**

* feat: allow users to only use individual grant, and not require all entities/repositories 
* feat: token introspection
* chore: documentation
