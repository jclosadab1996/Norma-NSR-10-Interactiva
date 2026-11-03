// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://nsr10-interactiva.example',
  integrations: [react(), mdx()],
  markdown: {
    // Astro 7: los plugins remark/rehype se pasan a través del procesador `unified`.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { output: 'html' }]],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
