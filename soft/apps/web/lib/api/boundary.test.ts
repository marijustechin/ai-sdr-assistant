import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "lib"];
const SOURCE_FILE = /\.(ts|tsx)$/;
const DIRECTIVE = /^\s*["']use client["'];?/m;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(full);
    }
    const isTest = entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx");
    return SOURCE_FILE.test(entry.name) && !isTest ? [full] : [];
  });
}

const sourceFiles = SOURCE_DIRS.flatMap((dir) =>
  listSourceFiles(resolve(ROOT, dir)),
);

function read(file: string): string {
  return readFileSync(file, "utf8");
}

function isClientModule(source: string): boolean {
  return DIRECTIVE.test(source);
}

describe("INTERNAL_API_KEY boundary", () => {
  it("marks the API client and env loader as server-only", () => {
    expect(read(resolve(ROOT, "lib/api/client.ts"))).toContain(
      'import "server-only"',
    );
    expect(read(resolve(ROOT, "lib/env.ts"))).toContain('import "server-only"');
  });

  it("never exposes API configuration through NEXT_PUBLIC_ variables", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z_]*INTERNAL_API_KEY/);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z_]*API_BASE_URL/);
    }
  });

  it("never references INTERNAL_API_KEY from a client component", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      if (isClientModule(source)) {
        expect(source, file).not.toContain("INTERNAL_API_KEY");
      }
    }
  });

  it("never imports the server-only API client or env from a client component", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      if (!isClientModule(source)) {
        continue;
      }
      expect(source, file).not.toMatch(/from ["']@\/lib\/api\/client["']/);
      expect(source, file).not.toMatch(/from ["']@\/lib\/env["']/);
    }
  });

  it("never imports the server-only Product API from a client component", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      if (!isClientModule(source)) {
        continue;
      }
      expect(source, file).not.toMatch(/from ["']@\/lib\/api\/products["']/);
    }
  });

  it("does not reference removed or deferred product fields", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      expect(source, file).not.toContain("researchStatus");
      expect(source, file).not.toContain("targetMarket");
    }
  });
});
