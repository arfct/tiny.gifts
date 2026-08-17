/**
 * tiny.gifts on Cloudflare Workers.
 *
 * Static files in public/ are served asset-first. Anything that matches no
 * asset — including card paths like /to:Peaches/from:Pistachio — lands here.
 *
 * Routes:
 *   /og     the Open Graph card, rasterized by the og-svg service
 *   /image  scrape a product page's og:image and redirect to it
 *   **      the server-rendered HTML shell
 */

import { infoForPath } from "../public/path-info.js";
import { shellHtml } from "./shell.js";
import { cardSvg } from "./card-svg.js";
import { proxyImage, ProxyError } from "./image-proxy.js";

const OG_CACHE = "public, max-age=300, s-maxage=31536000";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/og") return await renderCard(url, env);
      if (url.pathname === "/image") return await proxyImage(url.searchParams.get("url"));
      return shell(url);
    } catch (err) {
      return errorResponse(err);
    }
  },
};

function shell(url) {
  const info = infoForPath(url.pathname);
  return new Response(shellHtml(info, url.origin), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

async function renderCard(url, env) {
  const svg = cardSvg({
    re: url.searchParams.get("re") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
  });

  // Called over the service binding's fetch rather than its toPng RPC method:
  // same zero-hop routing and the same Response back, but it keeps this worker
  // independent of og-svg's class shape and trivially stubbable in tests.
  const rendered = await env.RENDER.fetch("https://og-svg/png", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ svg }),
  });

  if (!rendered.ok) {
    // A missing preview image beats a broken page: crawlers fall back to the
    // title and description.
    return new Response(null, {
      status: 302,
      headers: { Location: "/favicon.png", "Cache-Control": "no-store" },
    });
  }

  const headers = new Headers(rendered.headers);
  headers.set("Cache-Control", OG_CACHE);
  return new Response(rendered.body, { status: 200, headers });
}

function errorResponse(err) {
  const known = err instanceof ProxyError;
  const status = known ? err.status : 500;
  const code = known ? err.code : "internal_error";
  const message = known ? err.message : "Unexpected error";

  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
