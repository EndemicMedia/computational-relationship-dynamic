import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [svelte()],
  site: 'https://endemicmedia.github.io',
  base: '/computational-relationship-dynamic',
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
