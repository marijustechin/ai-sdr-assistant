import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Aliases mirror `tsconfig.json` so tests can import through the same
 * FSD-light layer specifiers (`@shared`, `@entities`, `@features`, `@widgets`).
 *
 * Test collection globs every current and target source root; during the
 * migration both the legacy (`lib/`, `components/`) and target (`shared/`,
 * `entities/`, `features/`, `widgets/`) roots are scanned.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@entities": fileURLToPath(new URL("./entities", import.meta.url)),
      "@features": fileURLToPath(new URL("./features", import.meta.url)),
      "@widgets": fileURLToPath(new URL("./widgets", import.meta.url)),
      // Next resolves `server-only` specially; alias it to a no-op for vitest.
      "server-only": fileURLToPath(
        new URL("./test-stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "components/**/*.test.ts",
      "shared/**/*.test.ts",
      "entities/**/*.test.ts",
      "features/**/*.test.ts",
      "widgets/**/*.test.ts",
    ],
  },
});
