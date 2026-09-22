/**
 * Approved AI SDR Assistant branding assets.
 *
 * Three WebP files under `public/branding/`, used exactly as supplied (never
 * recolored, cropped, or regenerated):
 * - `monogram` — the ASD symbol, used in the admin sidebar/header;
 * - `wordmark` — the symbol with the "AI SDR Assistant" caption (not wired into
 *   the shell: at the sidebar's width the existing two-line text is cleaner);
 * - `favicon`  — the app-icon variant, wired through Next metadata.
 */
export const BRANDING_ASSETS = {
  monogram: "/branding/ai-sdr-assistant-logo.webp",
  wordmark: "/branding/ai-sdr-assistant-logo-caption.webp",
  favicon: "/branding/ai-sdr-assistant-logo-favicon.webp",
} as const;

export const BRAND_NAME = "AI SDR Assistant";
export const BRAND_SUBTITLE = "Administration";

/**
 * The monogram sits next to the brand text, so it is decorative (`alt=""`) and
 * carries no duplicate accessible name.
 */
export const BRAND_MONOGRAM_ALT = "";

export const BRANDING_ICON_TYPE = "image/webp";

/** Icon metadata for the App Router (passed to `metadata.icons`). */
export function brandingIcons(): {
  icon: { url: string; type: string }[];
  shortcut: string;
} {
  return {
    icon: [{ url: BRANDING_ASSETS.favicon, type: BRANDING_ICON_TYPE }],
    shortcut: BRANDING_ASSETS.favicon,
  };
}
