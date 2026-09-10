import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.js';

/**
 * Client boundary for the central database.
 *
 * The underlying PrismaClient is created lazily so that an application can
 * boot (e.g. serve `GET /health`) without a configured or reachable database.
 * `checkReadiness()` is the only method that forces a real connectivity query.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private client: PrismaClient | undefined;

  /** Lazily-created typed Prisma client (throws if DATABASE_URL is unset). */
  get db(): PrismaClient {
    if (!this.client) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error('DATABASE_URL is not configured');
      }
      this.client = new PrismaClient({
        adapter: new PrismaPg({ connectionString: url }),
      });
    }
    return this.client;
  }

  /** Safe connectivity probe (never exposes connection strings or errors). */
  async checkReadiness(): Promise<void> {
    await this.db.$queryRawUnsafe('SELECT 1');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }
}
