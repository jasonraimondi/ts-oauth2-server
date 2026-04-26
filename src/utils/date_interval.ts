import ms, { type StringValue } from "ms";

export type DateIntervalType = string;

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
