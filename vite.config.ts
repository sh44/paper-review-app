import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
      ],

      manifest: {
        name: "Paper Review",
        short_name: "Paper Review",
        description: "Review and classify academic papers",
        theme_color: "#202020",
        background_color: "#202020",
        display: "standalone",
        orientation: "portrait",

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        /*
         * papers.csv è molto più grande del limite
         * predefinito di Workbox.
         */
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,

        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webp}",
        ],

        runtimeCaching: [
          {
            urlPattern: /\/papers\.csv$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "papers-csv",
              expiration: {
                maxEntries: 1,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});