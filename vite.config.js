import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: `${root}index.html`,
        auth: `${root}demos/01-auth/index.html`,
        database: `${root}demos/02-database/index.html`,
        storage: `${root}demos/03-storage/index.html`,
        realtime: `${root}demos/04-realtime/index.html`,
      },
    },
  },
});
