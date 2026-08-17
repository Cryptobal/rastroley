import type { ScanResult, TrackerCategory } from "./scanner";

export interface BannerConfig {
  siteName: string;
  categories: TrackerCategory[];
  policyUrl: string;
}

const CATEGORY_LABELS: Record<TrackerCategory, string> = {
  functional: "Funcionales",
  analytics: "Analíticas",
  marketing: "Marketing",
};

/**
 * Derive a Ley 21.719 compliant cookie-banner configuration from a scan.
 * "Funcionales" are always present; other categories only appear when detected.
 */
export function buildBannerConfig(scan: ScanResult, siteName: string): BannerConfig {
  const categories = new Set<TrackerCategory>(["functional"]);
  for (const tracker of scan.trackers) {
    categories.add(tracker.category);
  }

  return {
    siteName,
    categories: [...categories],
    policyUrl: "/politica-de-cookies",
  };
}

/** Render a plain-text preview of the consent banner copy. */
export function renderBannerText(config: BannerConfig): string {
  const labels = config.categories.map((c) => CATEGORY_LABELS[c]).join(", ");
  return [
    `${config.siteName} usa cookies para su funcionamiento y para las siguientes finalidades: ${labels}.`,
    `Conforme a la Ley 21.719, puede aceptar, rechazar o configurar el uso de cookies no esenciales.`,
    `Más información en nuestra política de cookies.`,
  ].join(" ");
}
