import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const input = Object.fromEntries(
  readdirSync(process.cwd())
    .filter((file) => file.endsWith(".html"))
    .map((file) => [file.slice(0, -5), resolve(process.cwd(), file)]),
);

// SkyWay distributes the licensed noise-canceller as a signed download in CI.
// Local builds without those credentials still need to build the game; the
// runtime already falls back to the unprocessed microphone stream on failure.
const noiseCancellerPackage = resolve(
  process.cwd(),
  "node_modules/skyway-ai-noise-canceller",
);
const aliases = existsSync(noiseCancellerPackage)
  ? []
  : [
      {
        find: "skyway-ai-noise-canceller",
        replacement: resolve(
          process.cwd(),
          "tools/skyway-ai-noise-canceller-unavailable.js",
        ),
      },
    ];

export default defineConfig({
  base: "/suspect-space/",
  resolve: {
    dedupe: ["@skyway-sdk/room"],
    alias: aliases,
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input,
      external: [/^three(?:\/.*)?$/],
    },
  },
});
