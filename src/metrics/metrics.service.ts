import { Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly telegramSendTotal = new Counter({
    name: 'telegram_alert_send_total',
    help: 'Total number of Telegram send outcomes grouped by result.',
    labelNames: ['result'] as const,
    registers: [this.registry],
  });

  private readonly telegramSendRetryTotal = new Counter({
    name: 'telegram_alert_send_retry_total',
    help: 'Total number of Telegram send retries.',
    registers: [this.registry],
  });

  constructor() {
    this.telegramSendTotal.inc({ result: 'success' }, 0);
    this.telegramSendTotal.inc({ result: 'failure' }, 0);
    this.telegramSendRetryTotal.inc(0);
  }

  incrementTelegramSendSuccess() {
    this.telegramSendTotal.inc({ result: 'success' });
  }

  incrementTelegramSendFailure() {
    this.telegramSendTotal.inc({ result: 'failure' });
  }

  incrementTelegramSendRetry() {
    this.telegramSendRetryTotal.inc();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  async getMetricsSnapshot(): Promise<string> {
    return this.registry.metrics();
  }
}
