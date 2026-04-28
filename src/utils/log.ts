import fs from 'node:fs';
import type { Logger } from '../core/types.ts';

export class ConsoleLogger implements Logger {
  #warningCount = 0;

  constructor(private readonly silent = false) {}

  get warningCount(): number {
    return this.#warningCount;
  }

  info(message: string): void {
    if (this.silent) {
      return;
    }
    fs.writeSync(process.stdout.fd, `${message}\n`);
  }

  warn(message: string): void {
    this.#warningCount += 1;
    if (this.silent) {
      return;
    }
    console.error(message);
  }

  error(message: string): void {
    console.error(message);
  }

  debug(message: string): void {
    if (this.silent) {
      return;
    }
    console.error(message);
  }
}
