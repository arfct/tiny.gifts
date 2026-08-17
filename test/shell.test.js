import { describe, it, expect } from "vitest";
import { escapeHtml, shellHtml } from "../src/shell.js";

describe("escapeHtml", () => {
  it("escapes angle brackets", () => {
    expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
  });

  it("escapes double quotes so attributes cannot be broken out of", () => {
    expect(escapeHtml('a"b')).toBe("a&quot;b");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("a'b")).toBe("a&#39;b");
  });

  it("escapes ampersands first so entities are not doubled", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("passes ordinary text through unchanged", () => {
    expect(escapeHtml("A tiny.gift for you")).toBe("A tiny.gift for you");
  });

  it("handles undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("shellHtml", () => {
  const origin = "https://tiny.gifts";

  it("uses the default title with no gift data", () => {
    expect(shellHtml(undefined, origin)).toContain("<title>tiny.gifts</title>");
  });

  it("builds a to/from title", () => {
    const html = shellHtml({ to: "Peaches", from: "Pistachio" }, origin);
    expect(html).toContain("to:Peaches, from:Pistachio");
  });

  it("uses re as the title and description when present", () => {
    const html = shellHtml({ re: "Happy birthday" }, origin);
    expect(html).toContain("<title>Happy birthday</title>");
    expect(html).toContain('content="Happy birthday"');
  });

  it("points og:image at the /og route with encoded params", () => {
    const html = shellHtml({ re: "Happy birthday", from: "P" }, origin);
    expect(html).toContain(`${origin}/og?`);
    // Plain text, form-encoded — not underscore-encoded, or the card would
    // render the underscore instead of a space.
    expect(html).toContain("re=Happy+birthday");
  });

  it("neutralises a script tag injected through re", () => {
    // The Firebase version interpolated this straight into <title> and og:*.
    const html = shellHtml({ re: '</title><script>alert(1)</script>' }, origin);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("neutralises an attribute break-out through to", () => {
    const html = shellHtml({ to: '"><img src=x onerror=alert(1)>' }, origin);
    expect(html).not.toContain('"><img');
    expect(html).toContain("&quot;");
  });

  it("keeps the mithril and gift.js script tags", () => {
    const html = shellHtml(undefined, origin);
    expect(html).toContain("/mithril.js");
    expect(html).toContain("/gift.js");
  });

  it("loads gift.js as a module so it can import path-info", () => {
    expect(shellHtml(undefined, origin)).toContain('type="module"');
  });
});
