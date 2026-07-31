/**
 * /image — scrapes a product page's og:image and redirects to it.
 *
 * The Firebase version fetched any URL a caller passed and 302'd to whatever it
 * found, making tiny.gifts an open redirect and a free scraping proxy. The
 * redirect is kept (bandwidth), but guarded: https only, no private or
 * link-local hosts, capped time and bytes, and the scraped target must itself
 * be https.
 *
 * Note on the limits of host filtering: a hostname that *resolves* to private
 * space cannot be caught here, since Workers cannot resolve DNS before
 * fetching. That is acceptable because a Worker's fetch has no route into a
 * private network anyway — the real risk being closed off is the open redirect.
 */

const TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "[::1]",
  "[::]",
  "0.0.0.0",
]);

export class ProxyError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ProxyError";
    this.status = status;
    this.code = code;
  }
}

function isPrivateIpv4(hostname) {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * @param {string|undefined} raw
 * @returns {URL} the validated target
 */
export function validateTarget(raw) {
  if (!raw) throw new ProxyError(400, "missing_url", "No url parameter");

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ProxyError(400, "bad_url", "url is not a valid absolute URL");
  }

  if (url.protocol !== "https:") {
    throw new ProxyError(400, "bad_scheme", "Only https URLs are allowed");
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || isPrivateIpv4(host)) {
    throw new ProxyError(400, "blocked_host", `Refusing to fetch ${host}`);
  }

  return url;
}

/**
 * Pulls og:image out of an HTML response using HTMLRewriter, replacing the
 * cheerio dependency the Firebase function used.
 *
 * @param {Response} res
 * @returns {Promise<string|null>} an https image URL, or null
 */
export async function extractOgImage(res) {
  let ogImage = null;
  let secureUrl = null;

  const rewriter = new HTMLRewriter().on("meta", {
    element(el) {
      const property = el.getAttribute("property");
      const content = el.getAttribute("content");
      if (!content) return;
      if (property === "og:image") ogImage ??= content;
      if (property === "og:image:secure_url") secureUrl ??= content;
    },
  });

  // Drain the transformed stream so the handlers run, capped so a huge page
  // cannot be read in full.
  const transformed = rewriter.transform(res);
  const reader = transformed.body.getReader();
  let read = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.byteLength;
      if (read > MAX_HTML_BYTES) break;
    }
  } finally {
    reader.releaseLock?.();
  }

  const found = ogImage ?? secureUrl;
  if (!found) return null;

  try {
    return new URL(found).protocol === "https:" ? found : null;
  } catch {
    return null;
  }
}

/**
 * @param {string|undefined} rawUrl
 * @returns {Promise<Response>} a 302 to the scraped image
 */
export async function proxyImage(rawUrl) {
  const target = validateTarget(rawUrl);

  let page;
  try {
    page = await fetch(target.href, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Sites often serve richer metadata to crawlers.
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    throw new ProxyError(502, "fetch_failed", `Could not fetch ${target.hostname}`);
  }

  if (!page.ok) {
    throw new ProxyError(502, "upstream_error", `${target.hostname} returned ${page.status}`);
  }

  const image = await extractOgImage(page);
  if (!image) {
    throw new ProxyError(404, "no_og_image", `No https og:image found on ${target.hostname}`);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: image,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
