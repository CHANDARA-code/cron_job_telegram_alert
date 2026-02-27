import { Injectable, Logger } from '@nestjs/common';
import { loadRuntimeConfig } from '@/config/env.validation';
import { MetricsService } from '@/metrics/metrics.service';
import type { TelegramParseMode } from '@schedules/dto/create-schedule.dto';

type AlertTimeSlot = '6:00 PM' | '9:00 PM';

export type AlertSendResult = {
  sent: boolean;
  detail: string;
};

type AttemptResult = AlertSendResult & { retryable: boolean };

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

@Injectable()
export class TelegramAlertService {
  private readonly logger = new Logger(TelegramAlertService.name);
  private readonly runtimeConfig = loadRuntimeConfig();
  private readonly botToken = this.runtimeConfig.telegramBotToken;
  private readonly chatId = this.runtimeConfig.telegramChatId;
  private readonly alertTimezone = this.runtimeConfig.alertTimezone;

  constructor(private readonly metricsService: MetricsService) {}

  async sendNow(time: '6pm' | '9pm') {
    const timeSlot: AlertTimeSlot = time === '6pm' ? '6:00 PM' : '9:00 PM';
    const message = this.buildReminderMessage(timeSlot);
    return this.sendMessage(message, 'HTML');
  }

  async sendMessage(
    message: string,
    parseMode: TelegramParseMode = 'HTML',
  ): Promise<AlertSendResult> {
    return this.sendTelegramMessage(message, parseMode);
  }

  private buildReminderMessage(timeSlot: AlertTimeSlot): string {
    const now = new Date();
    const timeLabel = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: this.alertTimezone,
    }).format(now);

    return [
      '<b>Scheduled Reminder</b>',
      `Time slot: <b>${timeSlot}</b>`,
      `Now: <code>${timeLabel}</code>`,
      '',
      '<i>Do something now.</i>',
    ].join('\n');
  }

  private async sendTelegramMessage(
    message: string,
    parseMode: TelegramParseMode,
  ): Promise<AlertSendResult> {
    const endpoint = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const maxAttempts = this.runtimeConfig.telegramMaxRetries;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await this.trySendMessage(
        endpoint,
        message,
        parseMode,
        attempt,
      );

      if (result.sent) {
        this.metricsService.incrementTelegramSendSuccess();
        return result;
      }

      if (!result.retryable || attempt === maxAttempts) {
        this.metricsService.incrementTelegramSendFailure();
        return { sent: false, detail: result.detail };
      }

      const backoffMs =
        this.runtimeConfig.telegramRetryBaseDelayMs * 2 ** (attempt - 1);
      this.metricsService.incrementTelegramSendRetry();
      this.logger.warn(
        `Telegram send attempt ${attempt} failed. Retrying in ${backoffMs}ms.`,
      );
      await this.sleep(backoffMs);
    }

    this.metricsService.incrementTelegramSendFailure();
    return { sent: false, detail: 'Telegram send failed after retries.' };
  }

  private async trySendMessage(
    endpoint: string,
    message: string,
    parseMode: TelegramParseMode,
    attempt: number,
  ): Promise<AttemptResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.runtimeConfig.telegramRequestTimeoutMs,
    );

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: parseMode,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const detail = `Telegram send failed (attempt ${attempt}/${this.runtimeConfig.telegramMaxRetries}): ${response.status} ${errorText}`;
        const retryable = RETRYABLE_STATUS_CODES.has(response.status);
        if (retryable) {
          this.logger.warn(detail);
        } else {
          this.logger.error(detail);
        }
        return { sent: false, detail, retryable };
      }

      const detail = 'Telegram alert sent.';
      this.logger.log(detail);
      return { sent: true, detail, retryable: false };
    } catch (error) {
      const detail = this.buildRequestErrorDetail(error, attempt);
      this.logger.warn(detail);
      return { sent: false, detail, retryable: true };
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildRequestErrorDetail(error: unknown, attempt: number): string {
    if (error instanceof Error && error.name === 'AbortError') {
      return `Telegram send timed out after ${this.runtimeConfig.telegramRequestTimeoutMs}ms (attempt ${attempt}/${this.runtimeConfig.telegramMaxRetries}).`;
    }

    const message = error instanceof Error ? error.message : String(error);
    return `Telegram send request error (attempt ${attempt}/${this.runtimeConfig.telegramMaxRetries}): ${message}`;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
