export interface Headers {
  location?: string;
  [key: string]: any;
}

export interface Options {
  headers?: Headers;
  body?: { [key: string]: any };
  query?: { [key: string]: any };
  [key: string]: any;
}

export interface ResponseInterface {
  status: number;
  headers: { [key: string]: any };
  body: { [key: string]: any };

  get(field: string): string;

  set(field: string, value: string): void;

  redirect(location: string): void;
}

export class OAuthResponse implements ResponseInterface {
  status = 200;
  body: object = {};
  headers: Headers = {};

  constructor(responseOptions: Options = { headers: {} }) {
    this.headers = {
      ...responseOptions.headers,
    };
  }

  get(field: string): any {
    console.log({ headers: this.headers, field });
    return "";
    // return this.headers[field.toLowerCase()];
  }

  redirect(location: string): void {
    this.set("Location", location);
    this.status = 302;
  }

  set(fieldOrHeaders: string, value: any): void {
    this.headers[fieldOrHeaders.toLowerCase()] = value;
  }
}
