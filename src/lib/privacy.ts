import { createHash } from "crypto";

/** Trunca IPv4 a /24 o IPv6 a /48 y hashea — minimización Ley 21.719. */
export function hashTruncatedIp(ip: string): string {
  const truncated = truncateIp(ip);
  return createHash("sha256").update(`rastro:${truncated}`).digest("hex").slice(0, 32);
}

export function truncateIp(ip: string): string {
  const cleaned = ip.trim().replace(/^::ffff:/, "");
  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  return "0.0.0.0";
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "0.0.0.0";
  return headers.get("x-real-ip") || "0.0.0.0";
}
