import { describe, it, expect } from "vitest";
import { cardSvg, tiltFor } from "../src/card-svg.js";

describe("cardSvg", () => {
  it("produces a 720x720 root element", () => {
    const svg = cardSvg({ re: "Hello" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="720"');
    expect(svg).toContain('height="720"');
  });

  it("renders the re text", () => {
    expect(cardSvg({ re: "A tiny.gift" })).toContain("A tiny.gift");
  });

  it("falls back to default copy when re is absent", () => {
    expect(cardSvg({})).toContain("A tiny.gift");
  });

  it("renders the from line prefixed with an em dash", () => {
    expect(cardSvg({ re: "Hi", from: "Pistachio" })).toContain("—Pistachio");
  });

  it("omits the from line when absent", () => {
    expect(cardSvg({ re: "Hi" })).not.toContain("—");
  });

  it("omits the from line for the literal string undefined", () => {
    // The old query-string plumbing could deliver "undefined" as text.
    expect(cardSvg({ re: "Hi", from: "undefined" })).not.toContain("—undefined");
  });

  it("escapes markup in the re text", () => {
    const svg = cardSvg({ re: '</text><script>alert(1)</script>' });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("escapes ampersands", () => {
    expect(cardSvg({ re: "Salt & Pepper" })).toContain("Salt &amp; Pepper");
  });

  it("splits newlines into tspans", () => {
    const svg = cardSvg({ re: "line one\nline two" });
    expect(svg).toContain("line one");
    expect(svg).toContain("line two");
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("inlines the starburst rather than referencing a file", () => {
    const svg = cardSvg({ re: "Hi" });
    // resvg cannot fetch external resources, so nothing may be referenced.
    expect(svg).not.toContain("stripes.svg");
    expect(svg).not.toContain("href=");
    expect(svg).toContain("<path");
  });

  it("uses Manrope so it matches the rendered card", () => {
    expect(cardSvg({ re: "Hi" })).toContain("Manrope");
  });
});

describe("tiltFor", () => {
  it("is deterministic for the same text", () => {
    expect(tiltFor("Hello")).toBe(tiltFor("Hello"));
  });

  it("differs for different text", () => {
    expect(tiltFor("Hello")).not.toBe(tiltFor("Goodbye"));
  });

  it("stays within the original +/- 2.5 degree range", () => {
    for (const s of ["", "a", "Hello", "A tiny.gift for you", "x".repeat(200)]) {
      expect(Math.abs(tiltFor(s))).toBeLessThanOrEqual(2.5);
    }
  });

  it("handles empty input", () => {
    expect(Number.isFinite(tiltFor(""))).toBe(true);
  });
});
