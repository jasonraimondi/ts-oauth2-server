# TypeScript OAuth2.0 Server

[![GitHub Workflow Status]( https://img.shields.io/github/actions/workflow/status/jasonraimondi/ts-oauth2-server/build-and-test.yml?branch=main&style=flat-square)](https://github.com/jasonraimondi/ts-oauth2-server)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage)
[![Maintainability](https://img.shields.io/codeclimate/coverage-letter/jasonraimondi/typescript-oauth2-server?label=maintainability&style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/maintainability)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jasonraimondi/ts-oauth2-server?style=flat-square)](https://github.com/jasonraimondi/ts-oauth2-server/releases/latest)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

`@jmondi/oauth2-server` is a standards compliant implementation of an OAuth 2.0 authorization server for Node, written in TypeScript. 

Requires `node >= 12`

Out of the box it supports the following grants:

- [Authorization code grant](https://jasonraimondi.github.io/ts-oauth2-server/grants/authorization_code.html)
- [Client credentials grant](https://jasonraimondi.github.io/ts-oauth2-server/grants/client_credentials.html)
- [Refresh grant](https://jasonraimondi.github.io/ts-oauth2-server/grants/refresh_token.html)
- [Implicit grant](https://jasonraimondi.github.io/ts-oauth2-server/grants/implicit.html) // not recommended 
- [Resource owner password credentials grant](https://jasonraimondi.github.io/ts-oauth2-server/grants/password.html) // not recommended

The following RFCs are implemented:

- [RFC6749 “OAuth 2.0”](https://tools.ietf.org/html/rfc6749)
- [RFC6750 “The OAuth 2.0 Authorization Framework: Bearer Token Usage”](https://tools.ietf.org/html/rfc6750)
- [RFC7009 “OAuth 2.0 Token Revocation”](https://tools.ietf.org/html/rfc7009)
- [RFC7519 “JSON Web Token (JWT)”](https://tools.ietf.org/html/rfc7519)
- [RFC7636 “Proof Key for Code Exchange by OAuth Public Clients”](https://tools.ietf.org/html/rfc7636)
