import { configs, defineConfig } from '@megahertz/oxconfig/oxlint';

export default defineConfig({
  ignorePatterns: ['tests/fixtures'],

  overrides: [
    configs.base,
    configs.strict,
    configs.ts,
    configs.tsStrict,
    configs.perfectionist,
    configs.node,
    configs.unicorn,
  ],
});
