import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

interface SchemaParseResult {
  success: boolean;
  data?: unknown;
  error?: {
    issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
  };
}

/**
 * Minimal structural view of a Zod-like schema. Declared locally so the API
 * host does not take a direct dependency on the contracts package's validator.
 */
interface SchemaLike {
  safeParse: (value: unknown) => SchemaParseResult;
}

/**
 * Validates a request value against a Zod schema. On failure it returns a
 * non-sensitive 400 with per-field issues (never the raw input or secrets).
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: SchemaLike) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: 'validation_failed',
        issues: (result.error?.issues ?? []).map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
