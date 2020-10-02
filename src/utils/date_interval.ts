import ms from "ms";

export type DateIntervalType = string;

export class DateInterval {
  public readonly init: number;
  public readonly ms: number;

  constructor(private readonly interval: DateIntervalType) {
    this.init = Date.now();
    this.ms = ms(interval);
  }

  getEndDate(): Date {
    return new Date(this.getEndTimeMs());
  }

  getEndTimeMs(): number {
    return this.init + this.ms;
  }

  getEndTimeSeconds(): number {
    return Math.ceil(this.getEndTimeMs() / 1000);
  }

  getSeconds(): number {
    return Math.ceil(this.ms / 1000);
  }

  static getDateEnd(ms: string) {
    return new DateInterval(ms).getEndDate();
  }
}
