import { existsSync, readFileSync, readdirSync } from "node:fs";
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
  plugins: [
    {
      name: "home-screen-manifest-assets",
      generateBundle(_options, bundle) {
        // Vite emits the manifest under assets/. Resolve its icons and launch
        // URL explicitly so installed apps do not look for them in assets/.
        for (const asset of Object.values(bundle)) {
          if (asset.type !== "asset" || !asset.fileName.endsWith(".webmanifest")) continue;
          const manifest = JSON.parse(String(asset.source));
          for (const icon of manifest.icons || []) {
            const name = icon.src.replace(/^\.\//, "").split("?")[0];
            const reference = this.emitFile({
              type: "asset",
              name,
              source: readFileSync(resolve(process.cwd(), name)),
            });
            icon.src = "/suspect-space/" + this.getFileName(reference);
          }
          manifest.id = "/suspect-space/space-suspect-complete.html";
          manifest.start_url = "/suspect-space/space-suspect-complete.html";
          manifest.scope = "/suspect-space/";
          asset.source = JSON.stringify(manifest, null, 2) + "\n";
        }
      },
    },
  ],
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
