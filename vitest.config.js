import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

// A 1x1 transparent PNG, enough for tests to assert we passed bytes through.
const STUB_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AL+g5S5AAAAAElFTkSuQmCC",
  ),
  (c) => c.charCodeAt(0),
);

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // og-svg is a separate deployment, so stand in for it locally. Tests
        // that care about real rasterizing belong in the og-svg repo.
        serviceBindings: {
          RENDER: async (request) => {
            const body = await request.json();
            if (!body.svg) {
              return Response.json({ error: "no svg", code: "empty_payload" }, { status: 400 });
            }
            return new Response(STUB_PNG, {
              headers: { "Content-Type": "image/png", "X-Stub": "1" },
            });
          },
        },
      },
    }),
  ],
});
