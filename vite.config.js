import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const input = Object.fromEntries(
  readdirSync(process.cwd())
    .filter((file) => file.endsWith(".html"))
    .map((file) => [file.slice(0, -5), resolve(process.cwd(), file)]),
);

export default defineConfig({
  base: "/suspect-space/",
  resolve: {
    dedupe: ["@skyway-sdk/room"],
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input,
      external: [/^three(?:\/.*)?$/],
    },
  },
});
