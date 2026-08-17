export type TrackerCategory = "analytics" | "marketing" | "functional";

export interface TrackerSignature {
  id: string;
  name: string;
  category: TrackerCategory;
  patterns: RegExp[];
}

export interface DetectedTracker {
  id: string;
  name: string;
  category: TrackerCategory;
}

export interface DetectedCookie {
  name: string;
}

export interface ScanResult {
  url: string;
  scannedAt: string;
  trackers: DetectedTracker[];
  cookies: DetectedCookie[];
  requiresConsent: boolean;
}

/**
 * Known third-party tracking technologies. Detection is intentionally based on
 * stable network/script signatures so it stays robust across minified pages.
 */
export const TRACKER_SIGNATURES: TrackerSignature[] = [
  {
    id: "ga4",
    name: "Google Analytics 4",
    category: "analytics",
    patterns: [/googletagmanager\.com\/gtag\/js/i, /google-analytics\.com\/(g\/collect|analytics\.js)/i],
  },
  {
    id: "gtm",
    name: "Google Tag Manager",
    category: "marketing",
    patterns: [/googletagmanager\.com\/gtm\.js/i],
  },
  {
    id: "meta-pixel",
    name: "Meta (Facebook) Pixel",
    category: "marketing",
    patterns: [/connect\.facebook\.net\/[^"']*\/fbevents\.js/i, /\bfbq\(\s*['"]init['"]/i],
  },
  {
    id: "tiktok-pixel",
    name: "TikTok Pixel",
    category: "marketing",
    patterns: [/analytics\.tiktok\.com/i],
  },
  {
    id: "linkedin-insight",
    name: "LinkedIn Insight Tag",
    category: "marketing",
    patterns: [/snap\.licdn\.com/i],
  },
  {
    id: "hotjar",
    name: "Hotjar",
    category: "analytics",
    patterns: [/static\.hotjar\.com/i, /\bhj\(\s*['"]?[a-z]/i],
  },
  {
    id: "clarity",
    name: "Microsoft Clarity",
    category: "analytics",
    patterns: [/clarity\.ms\/tag/i],
  },
  {
    id: "doubleclick",
    name: "Google Ads / DoubleClick",
    category: "marketing",
    patterns: [/googleadservices\.com/i, /doubleclick\.net/i],
  },
];

/** Scan raw HTML for known tracking technologies. */
export function analyzeHtml(html: string): DetectedTracker[] {
  const detected: DetectedTracker[] = [];
  for (const sig of TRACKER_SIGNATURES) {
    if (sig.patterns.some((p) => p.test(html))) {
      detected.push({ id: sig.id, name: sig.name, category: sig.category });
    }
  }
  return detected;
}

/** Parse cookie names from raw Set-Cookie response headers. */
export function parseCookies(setCookieHeaders: string[]): DetectedCookie[] {
  const names = new Set<string>();
  for (const header of setCookieHeaders) {
    const firstPair = header.split(";")[0]?.trim();
    const name = firstPair?.split("=")[0]?.trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names].map((name) => ({ name }));
}

/** Build a full scan result from a fetched page. */
export function buildScanResult(
  url: string,
  html: string,
  setCookieHeaders: string[],
): ScanResult {
  const trackers = analyzeHtml(html);
  const cookies = parseCookies(setCookieHeaders);
  const requiresConsent =
    cookies.length > 0 || trackers.some((t) => t.category !== "functional");

  return {
    url,
    scannedAt: new Date().toISOString(),
    trackers,
    cookies,
    requiresConsent,
  };
}
