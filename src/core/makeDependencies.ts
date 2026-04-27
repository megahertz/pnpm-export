import type { Dependencies } from '../types.ts';
import { ConsoleLogger } from '../utils/log.ts';
import type { Config } from './Config.ts';

export function makeDependencies({ config }: { config: Config }): Dependencies {
  return {
    config,
    logger: new ConsoleLogger(config.verbose),
  };
}
