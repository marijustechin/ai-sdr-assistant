/**
 * Detects a Prisma unique-constraint violation (P2002) without depending on
 * the concrete error class, keeping the check portable across Prisma versions.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
