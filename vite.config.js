import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  server:{
    port: 4820
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vue": ["vue"],
          "qrcode": ["qrcode"],
          "axios": ["axios"],
          "ant-design-vue": ["ant-design-vue"],
        },
      },
    },
  },
});
