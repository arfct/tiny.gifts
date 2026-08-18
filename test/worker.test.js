import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("HTML shell", () => {
  it("serves the shell at the root", async () => {
    const res = await SELF.fetch("https://tiny.gifts/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("<title>tiny.gifts</title>");
  });

  it("serves a card path with its title", async () => {
    const res = await SELF.fetch("https://tiny.gifts/re:Happy_birthday/from:P");
    expect(await res.text()).toContain("<title>Happy birthday</title>");
  });

  it("escapes markup injected through the path", async () => {
    const payload = encodeURIComponent('</title><script>alert(1)</script>');
    const html = await (await SELF.fetch(`https://tiny.gifts/re:${payload}`)).text();
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("uses the request origin in the og:image url", async () => {
    const html = await (await SELF.fetch("https://tiny.gifts/re:Hi")).text();
    expect(html).toContain("https://tiny.gifts/og?");
  });
});

describe("/og", () => {
  it("returns a png", async () => {
    const res = await SELF.fetch("https://tiny.gifts/og?re=Hello&from=P");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("goes through the render service binding", async () => {
    const res = await SELF.fetch("https://tiny.gifts/og?re=Hello");
    expect(res.headers.get("x-stub")).toBe("1");
  });

  it("works with no parameters at all", async () => {
    const res = await SELF.fetch("https://tiny.gifts/og");
    expect(res.status).toBe(200);
  });

  it("is cacheable", async () => {
    const res = await SELF.fetch("https://tiny.gifts/og?re=Hello");
    expect(res.headers.get("cache-control")).toContain("max-age");
  });
});

describe("/image", () => {
  it("rejects a missing url with a 400", async () => {
    const res = await SELF.fetch("https://tiny.gifts/image");
    expect(res.status).toBe(400);
  });

  it("rejects plain http with a 400", async () => {
    const res = await SELF.fetch("https://tiny.gifts/image?url=http://example.com");
    expect(res.status).toBe(400);
  });

  it("rejects a private host with a 400", async () => {
    const res = await SELF.fetch("https://tiny.gifts/image?url=https://169.254.169.254/");
    expect(res.status).toBe(400);
  });

  it("returns a structured json error", async () => {
    const res = await SELF.fetch("https://tiny.gifts/image");
    expect(await res.json()).toMatchObject({ code: expect.any(String) });
  });
});

// Static-asset routing sits in front of the Worker in production, so SELF.fetch
// cannot exercise it — every request here reaches the Worker script directly.
// Asset serving for /gift.css, /gift.js, /path-info.js and /img/* is verified
// against the deployment instead.
describe("catch-all", () => {
  it("falls through to the shell for an unknown path", async () => {
    const res = await SELF.fetch("https://tiny.gifts/anything/at/all");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
