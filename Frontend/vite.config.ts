import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    base: "/neticeler/",
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/neticeler/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/neticeler/, "")
            }
        }
    }
});