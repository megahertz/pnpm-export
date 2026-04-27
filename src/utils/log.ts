import fs from 'node:fs';
import type { Logger } from '../types.ts';

export class ConsoleLogger implements Logger {
  #warningCount = 0;

  constructor(private readonly verboseEnabled = false) {}

  get warningCount(): number {
    return this.#warningCount;
  }

  info(message: string): void {
    fs.writeSync(process.stdout.fd, `${message}\n`);
  }

  warn(message: string): void {
    this.#warningCount += 1;
    console.error(message);
  }

  error(message: string): void {
    console.error(message);
  }

  debug(message: string): void {
    if (this.verboseEnabled) {
      console.error(message);
    }
  }
}
