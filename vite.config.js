// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Todo lo que empiece con /api irá al dominio de Cloud Functions.
      "/api": {
        target: "https://us-central1-tera-bot-1ba7c.cloudfunctions.net",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""), // /api/create_user -> /create_user
      },
    },
  },
});
