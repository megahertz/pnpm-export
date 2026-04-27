import { ConsoleLogger } from '../utils/log.ts';
import type { Config } from './Config.ts';
import type { Dependencies } from './types.ts';

export function makeDependencies({ config }: { config: Config }): Dependencies {
  return {
    config,
    logger: new ConsoleLogger(config.verbose),
  };
}
