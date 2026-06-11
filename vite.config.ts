import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import postCssPxToRem from 'postcss-pxtorem'

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        postCssPxToRem({
          rootValue: 16,
          propList: ['*'],
          minPixelValue: 2,
        }),
      ],
    },
    preprocessorOptions: {
      less: {
        additionalData: `
          @import (reference) "@assets/less/variables.less";
          @import "@assets/less/mixins.less";
        `,
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
    },
  },
  server: {
    open: true,
  },
})
