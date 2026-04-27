import type { Dependencies } from '../types';
import { ConsoleLogger } from '../utils/log';
import type { Config } from './Config';

export function makeDependencies({ config }: { config: Config }): Dependencies {
  return {
    config,
    logger: new ConsoleLogger(config.verbose),
  };
}
