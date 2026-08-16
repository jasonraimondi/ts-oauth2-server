import ms, { type StringValue } from "ms";

/**
 * A duration in the `ms` package format, such as `"1h"`, `"15m"`, or `"30d"`.
 *
 * @see https://www.npmjs.com/package/ms
 */
export type DateIntervalType = string;

/**
 * A duration, used for the token TTLs the authorization server applies. Pass
 * one to {@link AuthorizationServer.enableGrantType} to change how long the
 * access tokens a grant issues live.
 *
 * @example
 * ```ts
 * import { DateInterval } from "@jmondi/oauth2-server";
 *
 * authorizationServer.enableGrantType("client_credentials", new DateInterval("30m"));
 * ```
 */
export class DateInterval {
  public readonly ms: number;

  constructor(interval: DateIntervalType) {
    this.ms = ms(interval as StringValue);
  }

  getEndDate(): Date {
    return new Date(this.getEndTimeMs());
  }

  getEndTimeMs(): number {
    return Date.now() + this.ms;
  }

  getEndTimeSeconds(): number {
    return Math.ceil(this.getEndTimeMs() / 1000);
  }

  getSeconds(): number {
    return Math.ceil(this.ms / 1000);
  }

  static getDateEnd(ms: string): Date {
    return new DateInterval(ms).getEndDate();
  }
}
