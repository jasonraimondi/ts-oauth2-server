export interface LoggerService {
  log(message?: any, ...optionalParams: any[]): void;
}

export class ConsoleLoggerService implements LoggerService {
  log = console.log;
}
