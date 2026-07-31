/**
 * The tiny.gifts URL format, shared verbatim by the Worker and the browser.
 *
 * Visible fields live in the path:      /to:Peaches/from:Pistacio/re:Hello_there
 *   `_` is a space, `__` a newline, values are percent-encoded.
 *
 * Hidden fields live in a base64 fragment, so the server never sees them:
 *   #<base64 of "note:.../code:...">
 *   The fragment carries an `_` every 300 characters, inserted to survive
 *   iMessage's URL parsing, and is stripped again on read.
 *
 * This module previously existed twice — in public/gift.js and
 * functions/index.js — differing only in whether underscores were substituted.
 */

/** Every 300 chars, matching the chunking applied when building a fragment. */
const FRAGMENT_CHUNK = 300;

/**
 * @param {string} path a URL path or a decoded fragment
 * @param {boolean} [clean] substitute `_`/`__` for spaces and newlines
 * @returns {Record<string,string>|undefined}
 */
export function infoForPath(path, clean = true) {
  if (!path || path.length <= 1) return undefined;

  const info = {};
  for (const segment of path.split("/")) {
    if (!segment.length) continue;
    const parts = segment.split(":");
    const key = parts.shift();
    let value = parts.join(":");
    if (clean) value = value.replace(/__/g, "\n").replace(/_/g, " ");
    try {
      info[key] = decodeURIComponent(value);
    } catch {
      info[key] = value;
    }
  }
  return info;
}

/** Inverse of the `clean` substitution in infoForPath. */
export function cleanText(text) {
  if (!text) return "";
  return text.replace(/\n/g, "__").replace(/ /g, "_");
}

/** Splits an encoded fragment so no run exceeds FRAGMENT_CHUNK characters. */
export function chunkFragment(encoded) {
  const matches = encoded.match(new RegExp(`.{1,${FRAGMENT_CHUNK}}`, "g"));
  return matches ? matches.join("_") : encoded;
}

/**
 * Combines visible path fields with hidden fragment fields.
 *
 * @param {string} pathname
 * @param {string} [hash] including the leading '#'
 * @returns {Record<string,string>|undefined}
 */
export function giftDataFromUrl(pathname, hash = "") {
  let data = infoForPath(pathname);

  if (hash && hash.length > 1) {
    // Remove the chunking underscores before decoding.
    const encoded = hash.substring(1).replace(/_/g, "");
    let decoded;
    try {
      decoded = atob(encoded);
    } catch {
      decoded = undefined;
    }
    if (decoded) {
      // Hidden values are percent-encoded only — no underscore substitution.
      const hidden = infoForPath(decoded, false);
      if (hidden) data = Object.assign(data ?? {}, hidden);
    }
  }

  return data;
}
