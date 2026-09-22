import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRANDING_ASSETS,
  BRANDING_ICON_TYPE,
  brandingIcons,
} from "./branding";

const ROOT = process.cwd();

function read(file: string): string {
  return readFileSync(resolve(ROOT, file), "utf8");
}

describe("approved branding assets", () => {
  it("exposes the three approved WebP assets, unchanged on disk", () => {
    const paths = Object.values(BRANDING_ASSETS);
    expect(paths).toEqual([
      "/branding/ai-sdr-assistant-logo.webp",
      "/branding/ai-sdr-assistant-logo-caption.webp",
      "/branding/ai-sdr-assistant-logo-favicon.webp",
    ]);

    for (const publicPath of paths) {
      const file = resolve(ROOT, "public", publicPath.replace(/^\//, ""));
      expect(existsSync(file), file).toBe(true);
      const header = readFileSync(file);
      expect(header.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(header.subarray(8, 12).toString("ascii")).toBe("WEBP");
    }
  });

  it("builds the App Router icon metadata from the favicon asset", () => {
    const icons = brandingIcons();
    expect(icons.icon).toEqual([
      { url: BRANDING_ASSETS.favicon, type: BRANDING_ICON_TYPE },
    ]);
    expect(icons.shortcut).toBe(BRANDING_ASSETS.favicon);
  });
});

describe("branding integration in the UI", () => {
  it("wires the favicon through layout metadata", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain('from "@shared/lib/branding"');
    expect(layout).toContain("brandingIcons()");
    expect(layout).toContain("icons:");
  });

  it("uses the monogram in the sidebar instead of the placeholder square", () => {
    const sidebar = read("components/dashboard/sidebar.tsx");
    expect(sidebar).toContain("BRANDING_ASSETS.monogram");
    expect(sidebar).toContain("BRAND_NAME");
    expect(sidebar).toContain("BRAND_SUBTITLE");
    // The old "AS" placeholder mark is gone.
    expect(sidebar).not.toMatch(/>\s*AS\s*</);
    expect(sidebar).not.toContain("rounded-md bg-primary");
  });

  it("uses the monogram in the mobile header", () => {
    const shell = read("components/dashboard/dashboard-shell.tsx");
    expect(shell).toContain("BRANDING_ASSETS.monogram");
    expect(shell).toContain("BRAND_NAME");
  });
});
