import { configs, defineConfig } from '@megahertz/oxconfig/oxlint';

export default defineConfig({
  overrides: [configs.base, configs.ts, configs.node, configs.unicorn],
});
