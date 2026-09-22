import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
/** Every source root the layering rules apply to (only those that exist). */
const SOURCE_DIRS = [
  "app",
  "components",
  "lib",
  "shared",
  "entities",
  "features",
  "widgets",
].filter((dir) => existsSync(resolve(ROOT, dir)));
const SOURCE_FILE = /\.(ts|tsx)$/;
const DIRECTIVE = /^\s*["']use client["'];?/m;
const SERVER_DIRECTIVE = /^\s*["']use server["'];?/m;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(full);
    }
    const isTest =
      entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx");
    return SOURCE_FILE.test(entry.name) && !isTest ? [full] : [];
  });
}

const sourceFiles = SOURCE_DIRS.flatMap((dir) =>
  listSourceFiles(resolve(ROOT, dir)),
);

function read(file: string): string {
  return readFileSync(file, "utf8");
}

function rel(file: string): string {
  return file.replace(resolve(ROOT) + sep, "").split(sep).join("/");
}

function isClientModule(source: string): boolean {
  return DIRECTIVE.test(source);
}

function under(file: string, dir: string): boolean {
  return rel(file).startsWith(`${dir}/`);
}

describe("INTERNAL_API_KEY boundary", () => {
  it("marks the API client and env loader as server-only", () => {
    expect(read(resolve(ROOT, "shared/api/client.ts"))).toContain(
      'import "server-only"',
    );
    expect(read(resolve(ROOT, "shared/config/env.ts"))).toContain(
      'import "server-only"',
    );
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
      expect(source, file).not.toMatch(/from ["']@shared\/api\//);
      expect(source, file).not.toMatch(/from ["']@shared\/config\//);
    }
  });

  it("never imports a server-only entity read API from a client component", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      if (isClientModule(source)) {
        expect(source, file).not.toMatch(/from ["']@entities\/[^"']+\/api["']/);
      }
    }
  });

  it("never imports the server-only Product or Research API from a client component", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      if (!isClientModule(source)) {
        continue;
      }
      expect(source, file).not.toMatch(/from ["']@\/lib\/api\/products["']/);
      expect(source, file).not.toMatch(/from ["']@\/lib\/api\/research["']/);
    }
  });

  it("marks the research API module server-only and free of direct database access", () => {
    const source = read(resolve(ROOT, "lib/api/research.ts"));
    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/@ai-sdr\/database/);
  });

  it("marks the dashboard API module server-only and free of direct database access", () => {
    const source = read(resolve(ROOT, "lib/api/dashboard.ts"));
    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/@ai-sdr\/database/);
  });

  it("never imports the server-only dashboard API from a client component", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      if (isClientModule(source)) {
        expect(source, file).not.toMatch(/from ["']@\/lib\/api\/dashboard["']/);
      }
    }
  });

  it("keeps deferred fields out of the product UI code", () => {
    const productUiFiles = sourceFiles.filter(
      (file) =>
        file.includes(`${sep}lib${sep}products${sep}`) ||
        file.includes(`${sep}components${sep}products${sep}`),
    );
    for (const file of productUiFiles) {
      const source = read(file);
      expect(source, file).not.toContain("researchStatus");
      expect(source, file).not.toContain("targetMarket");
    }
  });

  it("does not reference the deferred researchStatus product field anywhere", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      expect(source, file).not.toContain("researchStatus");
    }
  });
});

describe("FSD-light layer boundaries", () => {
  it("never imports the app/ routing layer from a slice", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      expect(source, file).not.toMatch(/from ["']@\/app(\/|["'])/);
      expect(source, file).not.toMatch(/from ["'](\.\.\/)+app\//);
    }
  });

  it("keeps shared/ independent of entities/features/widgets", () => {
    for (const file of sourceFiles.filter((f) => under(f, "shared"))) {
      const source = read(file);
      expect(source, file).not.toMatch(/from ["']@entities\//);
      expect(source, file).not.toMatch(/from ["']@features\//);
      expect(source, file).not.toMatch(/from ["']@widgets\//);
    }
  });

  it("keeps entities/ free of feature and widget imports", () => {
    for (const file of sourceFiles.filter((f) => under(f, "entities"))) {
      const source = read(file);
      expect(source, file).not.toMatch(/from ["']@features\//);
      expect(source, file).not.toMatch(/from ["']@widgets\//);
    }
  });

  it("keeps features/ free of widget imports", () => {
    for (const file of sourceFiles.filter((f) => under(f, "features"))) {
      const source = read(file);
      expect(source, file).not.toMatch(/from ["']@widgets\//);
    }
  });

  it("keeps every entity read API server-only", () => {
    for (const file of sourceFiles.filter(
      (f) => under(f, "entities") && rel(f).endsWith("/api.ts"),
    )) {
      expect(read(file), file).toContain('import "server-only"');
    }
  });

  it("keeps every feature action file server-marked", () => {
    for (const file of sourceFiles.filter(
      (f) => under(f, "features") && rel(f).endsWith("/actions.ts"),
    )) {
      expect(SERVER_DIRECTIVE.test(read(file)), file).toBe(true);
    }
  });
});
