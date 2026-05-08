// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://youk-lab.example.com',
  integrations: [mdx(), sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
    envPrefix: ['PUBLIC_', 'SANITY_'],
    build: {
      // Pagefind drops its bundle into /pagefind/ AFTER `astro build`.
      // Treat the runtime import as external so Rollup doesn't try to resolve it.
      rollupOptions: {
        external: [/^\/pagefind\//],
      },
    },
  },
});
