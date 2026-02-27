import { Injectable, Logger } from '@nestjs/common';
import type { TelegramParseMode } from '@schedules/dto/create-schedule.dto';

export const DEFAULT_ALERT_TIMEZONE = 'Asia/Phnom_Penh';
type AlertTimeSlot = '6:00 PM' | '9:00 PM';

export type AlertSendResult = {
  sent: boolean;
  detail: string;
};

@Injectable()
export class TelegramAlertService {
  private readonly logger = new Logger(TelegramAlertService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;
  private readonly alertTimezone =
    process.env.ALERT_TIMEZONE ?? DEFAULT_ALERT_TIMEZONE;

  async sendNow(time: '6pm' | '9pm') {
    const timeSlot: AlertTimeSlot = time === '6pm' ? '6:00 PM' : '9:00 PM';
    const message = this.buildReminderMessage(timeSlot);
    return this.sendMessage(message, 'HTML');
  }

  async sendMessage(
    message: string,
    parseMode: TelegramParseMode = 'HTML',
  ): Promise<AlertSendResult> {
    if (!this.botToken || !this.chatId) {
      const detail =
        'Skipping Telegram alert. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.';
      this.logger.warn(detail);
      return { sent: false, detail };
    }

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
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: message,
        parse_mode: parseMode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const detail = `Telegram send failed: ${response.status} ${errorText}`;
      this.logger.error(detail);
      return { sent: false, detail };
    }

    const detail = 'Telegram alert sent.';
    this.logger.log(detail);
    return { sent: true, detail };
  }
}
