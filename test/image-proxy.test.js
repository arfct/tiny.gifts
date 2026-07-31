import { describe, it, expect } from "vitest";
import { validateTarget, extractOgImage, ProxyError } from "../src/image-proxy.js";

describe("validateTarget", () => {
  it("accepts an https url", () => {
    expect(validateTarget("https://example.com/p").hostname).toBe("example.com");
  });

  it("rejects plain http", () => {
    expect(() => validateTarget("http://example.com")).toThrow(ProxyError);
  });

  it("rejects a file url", () => {
    expect(() => validateTarget("file:///etc/passwd")).toThrow(ProxyError);
  });

  it("rejects a data url", () => {
    expect(() => validateTarget("data:text/html,hi")).toThrow(ProxyError);
  });

  it("rejects an unparseable url", () => {
    expect(() => validateTarget("not a url")).toThrow(ProxyError);
  });

  it("rejects a missing url", () => {
    expect(() => validateTarget(undefined)).toThrow(ProxyError);
  });

  it("rejects localhost", () => {
    expect(() => validateTarget("https://localhost/x")).toThrow(ProxyError);
  });

  it("rejects the loopback literal", () => {
    expect(() => validateTarget("https://127.0.0.1/x")).toThrow(ProxyError);
  });

  it("rejects a private 10.x literal", () => {
    expect(() => validateTarget("https://10.1.2.3/x")).toThrow(ProxyError);
  });

  it("rejects a private 192.168.x literal", () => {
    expect(() => validateTarget("https://192.168.0.1/x")).toThrow(ProxyError);
  });

  it("rejects a private 172.16.x literal", () => {
    expect(() => validateTarget("https://172.16.5.4/x")).toThrow(ProxyError);
  });

  it("allows a public 172.32.x literal", () => {
    expect(validateTarget("https://172.32.5.4/x").hostname).toBe("172.32.5.4");
  });

  it("rejects link-local 169.254.x", () => {
    expect(() => validateTarget("https://169.254.169.254/latest/meta-data")).toThrow(
      ProxyError,
    );
  });

  it("rejects an ipv6 loopback literal", () => {
    expect(() => validateTarget("https://[::1]/x")).toThrow(ProxyError);
  });

  it("reports rejections as a 400", () => {
    expect(() => validateTarget("http://example.com")).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });
});

describe("extractOgImage", () => {
  const page = (head) => `<html><head>${head}</head><body>x</body></html>`;

  it("finds og:image", async () => {
    const html = page('<meta property="og:image" content="https://cdn.example/a.jpg">');
    expect(await extractOgImage(new Response(html))).toBe("https://cdn.example/a.jpg");
  });

  it("falls back to og:image:secure_url", async () => {
    const html = page(
      '<meta property="og:image:secure_url" content="https://cdn.example/b.jpg">',
    );
    expect(await extractOgImage(new Response(html))).toBe("https://cdn.example/b.jpg");
  });

  it("prefers og:image over the secure_url variant", async () => {
    const html = page(
      '<meta property="og:image:secure_url" content="https://cdn.example/b.jpg">' +
        '<meta property="og:image" content="https://cdn.example/a.jpg">',
    );
    expect(await extractOgImage(new Response(html))).toBe("https://cdn.example/a.jpg");
  });

  it("returns null when there is no og:image", async () => {
    expect(await extractOgImage(new Response(page("<title>x</title>")))).toBe(null);
  });

  it("ignores a non-https og:image", async () => {
    const html = page('<meta property="og:image" content="http://cdn.example/a.jpg">');
    expect(await extractOgImage(new Response(html))).toBe(null);
  });
});
