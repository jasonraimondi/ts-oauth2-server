# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.2.1] - 2025-12-03

### Fixed
- Missing finalize calls in AuthorizationCodeGrant, ImplicitGrant, and TokenExchangeGrant

## [4.2.0] - 2025-10-31

### Added
- Support for opaque refresh tokens
- originatingAuthCodeId now provided as argument to extraTokenFields callback

### Fixed
- originatingAuthCodeId now properly populated during RefreshTokenGrant
- originatingAuthCodeId now properly populated before calling tokenRepository.persist

## [4.1.1] - 2025-10-20

### Fixed
- Reset originatingAuthCodeId in refresh_token scope test
- Package version bump for patch release

## [4.1.0] - 2025-10-19

### Added
- Support for opaque authorization codes
- Documentation for `useOpaqueAuthorizationCodes` option
- Agent for answering questions
- Expanded FAQ on token validation and errors
- Logger documentation improvements

### Fixed
- Null safety checks for opaque authorization code validation
- Token validation documentation to use jti claim

## [4.0.11] - 2025-09-20

### Added
- Optional logger support for debugging token operations, revocations, and grant processing errors

### Fixed
- Missing validation parameters in `getUserByCredentials` calls in authorization code grant
- Client ownership validation for token revocation per RFC 7009
- Duplicate dts keys in tsup build configuration

### Security
- Enhanced validation for client ownership during token revocation

## [4.0.10] - 2025-08-04

### Fixed
- Content-type header handling for charset parameters normalization
- URL-encoded body parsing improvements

## [4.0.9] - 2025-08-04

### Fixed
- Allow empty client secrets in basic authentication

## [4.0.8] - 2025-08-04

### Fixed
- Unauthorized client and scope exceptions now correctly throw 401 instead of 400
- Missing finalize scopes in client credentials and refresh token grants

## [4.0.7] - 2025-06-25

### Fixed
- Express adapter build errors from response status handling

## [4.0.6] - 2025-06-20

### Fixed
- Introspect and revoke endpoints now return falsey values instead of throwing for invalid tokens (per OAuth spec)
- Token revocation inconsistencies to match OAuth spec RFC 7009

## [4.0.5] - 2025-06-05

### Fixed
- RequestFromVanilla headers handling
- Swallowed exceptions from improper exports in adapters

## [4.0.4] - 2025-06-04

### Fixed
- Crypto imports to use direct crypto instead of node:crypto
- Vanilla adapters added to JSR exports
- Method check removed for requestFromVanilla
- GET method implementation
- Audience claim now supports string array or single string value
- Custom grant prefix override capability

## [4.0.3] - 2025-03-28

### Fixed
- Various bug fixes and improvements

## [4.0.2] - 2024-08-24

### Fixed
- Various bug fixes and improvements

## [4.0.1] - 2024-08-12

### Fixed
- Various bug fixes and improvements

## [4.0.0] - 2024-08-11

### Added
- Support for token introspection with client credentials authentication
- Custom scope delimiter support
- More explicit error messages when client is determined to be invalid
- Automatic enabling of client_credentials and refresh_token grants
- Optional status parameter in OAuth response constructor
- Guard utility function against invalid client scopes
- Export of isOAuthError helper function

### Changed
- **BREAKING**: Default authentication with client_credentials for introspect and revoke endpoints
- Configuration options renamed to `authenticateIntrospect` & `authenticateRevoke`

### Security
- Enhanced default security for introspect and revoke endpoints requiring client authentication

## [3.6.0] - 2024-08-11

### Added
- Configuration option for toggling revoke and introspect authentication
- Nuxt documentation

### Changed
- Preparation for v4.0.0 authentication defaults

## [3.5.0] - 2024-01-01

### Added
- Various feature improvements

## [3.4.1] - 2024-01-01

### Fixed
- Various bug fixes

## [3.4.0] - 2024-01-01

### Added
- Various feature improvements

## [3.3.1] - 2024-01-01

### Fixed
- Various bug fixes

## [3.3.0] - 2024-01-01

### Added
- Various feature improvements

## [3.2.0] - 2024-01-01

### Added
- Various feature improvements

## [3.1.0] - 2024-01-01

### Added
- Various feature improvements

## [3.0.4] - 2024-01-01

### Fixed
- Various bug fixes

## [3.0.2] - 2024-01-01

### Fixed
- Various bug fixes

## [3.0.1] - 2024-01-01

### Fixed
- Various bug fixes

## [3.0.0] - 2024-01-01

### Added
- Docusaurus documentation site refactor
- Vanilla adapter for framework-agnostic usage
- responseToVanilla adapter
- JSR.json file for JSR (JavaScript Registry) support
- Support for issuer and audience in extraParams
- Custom grants support
- Token-exchange grant type (RFC 8693)
- Redirect URI with port support

### Changed
- **BREAKING**: Remove setOptions method
- **BREAKING**: Add options as grant constructor argument
- Default options system implementation
- More explicit imports for better tree-shaking

### Fixed
- Various improvements and bug fixes

## [2.6.1] - 2023-01-01

### Fixed
- Various bug fixes

## [2.6.0] - 2023-01-01

### Added
- Various feature improvements

## [2.5.0] - 2023-01-01

### Added
- Various feature improvements

## [2.4.0] - 2023-01-01

### Added
- Various feature improvements

## [2.3.0] - 2023-01-01

### Added
- Various feature improvements

## [2.2.5] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.4] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.3] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.2] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.1] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.0] - 2023-01-01

### Added
- Various feature improvements

## [2.1.0] - 2023-01-01

### Added
- Various feature improvements

## [2.0.5] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.4] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.3] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.2] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.1] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.0] - 2023-01-01

### Added
- Various feature improvements

### Changed
- **BREAKING**: Major version upgrade with significant changes

## [1.3.0] - 2022-01-01

### Added
- Various feature improvements

## [1.2.0] - 2022-01-01

### Added
- Various feature improvements

## [1.1.1] - 2022-01-01

### Fixed
- Various bug fixes

## [1.1.0] - 2022-01-01

### Added
- Various feature improvements

## [1.0.4] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.3] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.2] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.1] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.0] - 2022-01-01

### Added
- Initial stable release
- Complete OAuth 2.0 authorization server implementation
- Support for multiple grant types (authorization_code, client_credentials, password, implicit, refresh_token)
- Framework adapters for Express and Fastify
- Repository pattern for data persistence
- Comprehensive test suite

### Security
- RFC-compliant OAuth 2.0 implementation
- PKCE (Proof Key for Code Exchange) support
- JWT token handling with proper validation