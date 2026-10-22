import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy API calls to FastAPI so the session cookie works without CORS setup.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/admin": "http://127.0.0.1:8000",
      "/teacher": "http://127.0.0.1:8000",
      "/student": "http://127.0.0.1:8000",
      "/api-root": {
        target: "http://127.0.0.1:8000",
        rewrite: () => "/",
      },
    },
  },
});
