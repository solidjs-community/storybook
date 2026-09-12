import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import solid from '@solidjs/vite-plugin';

export default defineConfig({
    plugins: [solid(), tailwindcss()],
});
