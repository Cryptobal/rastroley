import { describe, expect, it } from "vitest";
import { classifyScripts, extractScriptSrcs } from "@/lib/scan";
import { hashTruncatedIp, truncateIp } from "@/lib/privacy";

describe("free scan helpers", () => {
  it("extrae script src del HTML", () => {
    const html = `
      <script src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>
      <script src='https://connect.facebook.net/en_US/fbevents.js'></script>
      <script>inline()</script>
    `;
    const scripts = extractScriptSrcs(html);
    expect(scripts).toHaveLength(2);
    expect(classifyScripts(scripts).map((f) => f.id).sort()).toEqual(["ga4", "meta"]);
  });
});

describe("privacy minimization", () => {
  it("trunca IPv4 a /24", () => {
    expect(truncateIp("201.214.33.99")).toBe("201.214.33.0");
  });

  it("hashea de forma estable", () => {
    const a = hashTruncatedIp("201.214.33.99");
    const b = hashTruncatedIp("201.214.33.12");
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });
});
