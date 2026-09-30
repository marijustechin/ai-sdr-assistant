import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { OutreachSenderService } from './outreach-sender.service.js';

/**
 * Env-gated in-process trigger for the send worker. Default **off**
 * (`OUTREACH_SEND_SCHEDULER_ENABLED=true` to enable) — matching the project's
 * operational-safety convention. It is only a trigger: the DB queue is the
 * source of truth, and the manual `run-due` endpoint remains available for
 * controlled testing.
 */
@Injectable()
export class OutreachSendScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(OutreachSenderService)
    private readonly service: OutreachSenderService,
  ) {}

  onModuleInit(): void {
    if (process.env.OUTREACH_SEND_SCHEDULER_ENABLED !== 'true') return;
    const interval = Number(
      process.env.OUTREACH_SEND_SCHEDULER_INTERVAL_MS ?? 30_000,
    );
    this.timer = setInterval(
      () => {
        void this.service.processDue(10).catch(() => undefined);
      },
      Math.max(1_000, interval),
    );
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
