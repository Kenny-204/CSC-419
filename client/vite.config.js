import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
 server: {
  proxy: {
    '/api': {
      target: 'https://csc-419.onrender.com/:5000',
      changeOrigin: true,
    }
  }
},
  publicDir: "public",
  assetsInclude: ["**/*.bin"],
});

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 3000,
//     proxy: {
//       '/api': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//       }
//     }
//   },
//   // Prevent Vite from intercepting static file requests under /models
//   publicDir: 'public',
//   assetsInclude: ['**/*.bin'],
// })
