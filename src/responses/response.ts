export interface Headers {
  location?: string;
  [key: string]: any;
}

export interface Options {
  headers?: Headers;
  body?: { [key: string]: any };
  query?: { [key: string]: any };
  status?: number;
  [key: string]: any;
}

export interface ResponseInterface {
  status: number;
  headers: { [key: string]: any };
  body: { [key: string]: any };

  get(field: string): string;

  set(field: string, value: string): void;
}

export class OAuthResponse implements ResponseInterface {
  status: number;
  body: Record<string, unknown>;
  headers: Headers;

  constructor(responseOptions: Options = { headers: {} }) {
    this.headers = responseOptions.headers ?? {};
    this.body = responseOptions.body ?? {};
    this.status = responseOptions.status ?? 200;
  }

  get(field: string): any {
    return this.headers[field.toLowerCase()];
  }

  set(fieldOrHeaders: string, value: any): void {
    this.headers[fieldOrHeaders.toLowerCase()] = value;
  }
}
