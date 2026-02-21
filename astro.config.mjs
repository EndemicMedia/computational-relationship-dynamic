import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [svelte()],
  output: 'static',
  build: {
    assets: '_astro'
  },
  vite: {
    worker: {
      format: 'es'
    }
  }
});
