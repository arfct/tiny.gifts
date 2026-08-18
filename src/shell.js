/**
 * The server-rendered HTML shell.
 *
 * The Firebase version interpolated path values straight into <title> and the
 * og:* meta attributes with no escaping, so a crafted path could inject markup
 * (functions/index.js:39-54). Everything user-derived now goes through
 * escapeHtml.
 */



export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {Record<string,string>|undefined} info
 * @param {string} origin e.g. "https://tiny.gifts"
 */
export function shellHtml(info, origin) {
  let title = "tiny.gifts";
  let description = "a tiny.gift";
  let image = "";

  if (info) {
    if (info.to) title = `to:${info.to}, from:${info.from}`;
    if (info.re) {
      title = info.re;
      description = info.re;
    }
    image = ogImageUrl(info, origin);
  }

  return `<!doctype html>
<head>
  <title>${escapeHtml(title)}</title>
  <meta name="theme-color" content="#2d2d2d">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=block" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=block" rel="stylesheet">
  <link rel="stylesheet" type="text/css" href="/gift.css">
  <script src="/mithril.js"></script>
  <style id="theme"></style>
</head>
<body class="default loading"><div id="main-container"></div></body>
<script type="module" src="/gift.js"></script>
</html>`;
}

/**
 * Absolute /og URL carrying the visible fields the card needs.
 *
 * Values are passed as plain text — infoForPath has already turned `_` into
 * spaces and `__` into newlines, and URLSearchParams handles the encoding. Do
 * not re-apply cleanText here: that would send `Happy_birthday` and the card
 * would render the underscore.
 */
export function ogImageUrl(info, origin) {
  const params = new URLSearchParams();
  if (info.to) params.set("to", info.to);
  if (info.from) params.set("from", info.from);
  if (info.re) params.set("re", info.re);
  return `${origin}/og?${params.toString()}`;
}
