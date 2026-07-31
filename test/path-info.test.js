import { describe, it, expect } from "vitest";
import { infoForPath, giftDataFromUrl, cleanText } from "../public/path-info.js";

describe("infoForPath", () => {
  it("returns undefined for the root path", () => {
    expect(infoForPath("/")).toBeUndefined();
  });

  it("reads key:value segments", () => {
    expect(infoForPath("/to:Peaches/from:Pistacio")).toEqual({
      to: "Peaches",
      from: "Pistacio",
    });
  });

  it("turns single underscores into spaces", () => {
    expect(infoForPath("/re:A_tiny.gift_for_you").re).toBe("A tiny.gift for you");
  });

  it("turns double underscores into newlines", () => {
    expect(infoForPath("/note:one__two").note).toBe("one\ntwo");
  });

  it("keeps colons inside a value", () => {
    expect(infoForPath("/re:9:30_at_the_park").re).toBe("9:30 at the park");
  });

  it("requires slashes in a value to be percent-encoded", () => {
    // '/' is the segment separator, so a literal slash cannot survive — true of
    // the original implementation too. Callers percent-encode, which is why this
    // never bites in practice.
    const encoded = encodeURIComponent("https://example.com/a");
    expect(infoForPath(`/link:${encoded}`).link).toBe("https://example.com/a");
  });

  it("percent-decodes values", () => {
    expect(infoForPath("/to:%C3%A9l%C3%A8ve").to).toBe("élève");
  });

  it("skips empty segments", () => {
    expect(infoForPath("//to:X//")).toEqual({ to: "X" });
  });

  it("leaves underscores alone when clean is false", () => {
    expect(infoForPath("/note:a_b", false).note).toBe("a_b");
  });
});

describe("cleanText", () => {
  it("round-trips spaces and newlines through infoForPath", () => {
    const original = "Thinking of you\nalways";
    const encoded = cleanText(original);
    expect(infoForPath(`/note:${encoded}`).note).toBe(original);
  });

  it("encodes a space as a single underscore", () => {
    expect(cleanText("a b")).toBe("a_b");
  });

  it("encodes a newline as a double underscore", () => {
    expect(cleanText("a\nb")).toBe("a__b");
  });
});

describe("giftDataFromUrl", () => {
  it("merges hidden fields from the base64 fragment", () => {
    // submit() percent-encodes each hidden value before joining with '/'.
    const link = encodeURIComponent("https://example.com");
    const hidden = btoa(`code:ABC-123/link:${link}`).replace(/=/g, "");
    const data = giftDataFromUrl("/to:Peaches", `#${hidden}`);
    expect(data).toMatchObject({
      to: "Peaches",
      code: "ABC-123",
      link: "https://example.com",
    });
  });

  it("strips the underscores inserted every 300 characters", () => {
    // gift.js splits long fragments with _ to survive iMessage URL parsing.
    const raw = btoa("info:" + "x".repeat(400)).replace(/=/g, "");
    const chunked = raw.match(/.{1,300}/g).join("_");
    const data = giftDataFromUrl("/", `#${chunked}`);
    expect(data.info).toBe("x".repeat(400));
  });

  it("does not apply underscore substitution to fragment values", () => {
    // Hidden fields are percent-encoded, not underscore-encoded.
    const hidden = btoa("note:a_b").replace(/=/g, "");
    expect(giftDataFromUrl("/", `#${hidden}`).note).toBe("a_b");
  });

  it("returns undefined when there is neither a path nor a fragment", () => {
    expect(giftDataFromUrl("/", "")).toBeUndefined();
  });

  it("survives a fragment that is not valid base64", () => {
    expect(() => giftDataFromUrl("/to:X", "#!!!not-base64!!!")).not.toThrow();
  });
});
