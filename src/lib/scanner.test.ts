import { describe, it, expect } from "vitest";
import { analyzeHtml, parseCookies, buildScanResult } from "./scanner";
import { buildBannerConfig, renderBannerText } from "./banner";

describe("analyzeHtml", () => {
  it("detects Google Analytics 4", () => {
    const html = `<script src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>`;
    const trackers = analyzeHtml(html);
    expect(trackers.map((t) => t.id)).toContain("ga4");
  });

  it("detects the Meta Pixel via fbq init", () => {
    const html = `<script>fbq('init', '123456');</script>`;
    const trackers = analyzeHtml(html);
    expect(trackers.map((t) => t.id)).toContain("meta-pixel");
  });

  it("returns nothing for a clean page", () => {
    expect(analyzeHtml("<html><body>Hola</body></html>")).toHaveLength(0);
  });
});

describe("parseCookies", () => {
  it("extracts cookie names from Set-Cookie headers", () => {
    const cookies = parseCookies([
      "sessionid=abc; Path=/; HttpOnly",
      "_ga=GA1.2.3; Max-Age=63072000",
    ]);
    expect(cookies.map((c) => c.name)).toEqual(["sessionid", "_ga"]);
  });

  it("deduplicates repeated cookie names", () => {
    const cookies = parseCookies(["a=1", "a=2"]);
    expect(cookies).toHaveLength(1);
  });
});

describe("buildScanResult", () => {
  it("flags consent when marketing trackers are present", () => {
    const html = `<script src="https://connect.facebook.net/en_US/fbevents.js"></script>`;
    const result = buildScanResult("https://ejemplo.cl", html, []);
    expect(result.requiresConsent).toBe(true);
  });

  it("does not require consent for a clean page without cookies", () => {
    const result = buildScanResult("https://ejemplo.cl", "<html></html>", []);
    expect(result.requiresConsent).toBe(false);
  });
});

describe("banner", () => {
  it("always includes functional and adds detected categories", () => {
    const html = `<script src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>`;
    const result = buildScanResult("https://ejemplo.cl", html, []);
    const config = buildBannerConfig(result, "ejemplo.cl");
    expect(config.categories).toContain("functional");
    expect(config.categories).toContain("analytics");
  });

  it("renders banner copy mentioning Ley 21.719", () => {
    const result = buildScanResult("https://ejemplo.cl", "<html></html>", []);
    const text = renderBannerText(buildBannerConfig(result, "ejemplo.cl"));
    expect(text).toContain("Ley 21.719");
  });
});
