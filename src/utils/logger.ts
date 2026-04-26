/**
 * Minimal logging contract used by {@link AuthorizationServer} and the grant
 * pipeline. Pass any object that satisfies this shape (e.g. `console`, pino,
 * winston, a NestJS logger, etc.) via `AuthorizationServer.options.logger` to
 * receive debug output for token operations, revocations, and grant errors.
 *
 * @example
 * ```ts
 * const server = new AuthorizationServer(
 *   clientRepository,
 *   accessTokenRepository,
 *   scopeRepository,
 *   "secret-key",
 *   { logger: console },
 * );
 * ```
 */
export interface LoggerService {
  log(message?: any, ...optionalParams: any[]): void;
}

/**
 * Default {@link LoggerService} implementation that forwards to `console.log`.
 * Provided as a convenience so consumers can opt in to logging without writing
 * their own adapter.
 *
 * @example
 * ```ts
 * import { AuthorizationServer, ConsoleLoggerService } from "@jmondi/oauth2-server";
 *
 * const server = new AuthorizationServer(
 *   clientRepository,
 *   accessTokenRepository,
 *   scopeRepository,
 *   "secret-key",
 *   { logger: new ConsoleLoggerService() },
 * );
 * ```
 */
export class ConsoleLoggerService implements LoggerService {
  log = console.log;
}
