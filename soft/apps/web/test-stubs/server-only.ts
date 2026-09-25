// Test stub for Next.js's `server-only` marker package.
// In the Next build, `server-only` is resolved to a module that throws when a
// server-only module is imported into a client bundle. Vitest (node) has no
// such resolution, so tests alias it to this no-op. The import guards remain in
// place and are still enforced by `next build`.
export {};
