import { z } from "zod";

const TRACKER_HINTS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: "ga4", label: "Google Analytics / gtag", pattern: /googletagmanager\.com|google-analytics\.com|gtag\/js/i },
  { id: "google-ads", label: "Google Ads", pattern: /googleadservices\.com|googlesyndication\.com|doubleclick\.net/i },
  { id: "meta", label: "Meta Pixel", pattern: /connect\.facebook\.net|fbevents\.js|facebook\.com\/tr/i },
  { id: "tiktok", label: "TikTok Pixel", pattern: /analytics\.tiktok\.com|tiktok.*pixel/i },
  { id: "hotjar", label: "Hotjar", pattern: /static\.hotjar\.com|hotjar/i },
  { id: "clarity", label: "Microsoft Clarity", pattern: /clarity\.ms/i },
  { id: "linkedin", label: "LinkedIn Insight", pattern: /snap\.licdn\.com|linkedin\.com\/px/i },
];

export const scanUrlSchema = z.object({
  url: z.string().url().max(2048),
});

export type ScanFinding = {
  id: string;
  label: string;
  scripts: string[];
};

export type FreeScanResult = {
  url: string;
  scannedAt: string;
  scripts: string[];
  findings: ScanFinding[];
  note: string;
  disclaimer: string;
};

export async function freeScan(url: string): Promise<FreeScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "RastroScanner/0.4 (+https://rastrochile.cl; free HTML scan)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const scripts = extractScriptSrcs(html);
  const findings = classifyScripts(scripts);

  return {
    url,
    scannedAt: new Date().toISOString(),
    scripts,
    findings,
    note:
      "Escaneo liviano: HTML + atributos src de <script>. No ejecuta JavaScript ni GTM. Trackers inyectados post-JS pueden no aparecer.",
    disclaimer:
      "Rastro no es asesoría legal, no garantiza cumplimiento de la Ley 21.719 y no cita montos de multa.",
  };
}

export function extractScriptSrcs(html: string): string[] {
  const out = new Set<string>();
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.add(m[1]);
  }
  return [...out].slice(0, 200);
}

export function classifyScripts(scripts: string[]): ScanFinding[] {
  return TRACKER_HINTS.map((hint) => {
    const matched = scripts.filter((s) => hint.pattern.test(s));
    return matched.length
      ? { id: hint.id, label: hint.label, scripts: matched }
      : null;
  }).filter((x): x is ScanFinding => Boolean(x));
}
