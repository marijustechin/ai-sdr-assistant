import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { FollowUpService } from './follow-up.service.js';

/** Default trigger cadence; the DB schedule (not process memory) is authoritative. */
const DEFAULT_INTERVAL_MINUTES = 15;
const DEFAULT_BATCH_SIZE = 10;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * A small in-process trigger that periodically asks `FollowUpService` to process
 * due reply checks. It is **disabled by default** (`FOLLOW_UP_SCHEDULER_ENABLED`)
 * so that a developer/API process never opens a mailbox unless explicitly
 * enabled; the schedule itself is DB-backed and survives restarts regardless.
 * The trigger never sends mail — it only checks replies to sent inquiries.
 */
@Injectable()
export class FollowUpScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FollowUpScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(FollowUpService) private readonly followUps: FollowUpService,
  ) {}

  onModuleInit(): void {
    if ((process.env.FOLLOW_UP_SCHEDULER_ENABLED ?? 'false') !== 'true') {
      this.logger.log('Follow-up scheduler disabled (FOLLOW_UP_SCHEDULER_ENABLED!=true).');
      return;
    }
    const minutes = positiveInt(
      process.env.FOLLOW_UP_INTERVAL_MINUTES,
      DEFAULT_INTERVAL_MINUTES,
    );
    const batch = positiveInt(process.env.FOLLOW_UP_BATCH_SIZE, DEFAULT_BATCH_SIZE);
    this.timer = setInterval(() => {
      void this.followUps.processDue(batch).catch(() => {
        this.logger.warn('Follow-up check batch failed.');
      });
    }, minutes * 60_000);
    // Do not keep the process alive solely for this timer.
    this.timer.unref?.();
    this.logger.log(`Follow-up scheduler enabled: every ${minutes}m, batch ${batch}.`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
