import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { TelegramAlertService } from '@/telegram-alert.service';

type TelegramSendMessagePayload = {
  chat_id: string;
  text: string;
  parse_mode: string;
};

type SendNowResponse = {
  success: boolean;
  message: string;
  time: string;
};

function isTelegramSendMessagePayload(
  value: unknown,
): value is TelegramSendMessagePayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.chat_id === 'string' &&
    typeof payload.text === 'string' &&
    typeof payload.parse_mode === 'string'
  );
}

function getPayloadFromRequestInit(
  requestInit: RequestInit | undefined,
): TelegramSendMessagePayload {
  if (typeof requestInit?.body !== 'string') {
    throw new Error('Expected request body to be a JSON string.');
  }

  const parsed: unknown = JSON.parse(requestInit.body);
  if (!isTelegramSendMessagePayload(parsed)) {
    throw new Error('Unexpected Telegram request payload shape.');
  }

  return parsed;
}

function isSendNowResponse(value: unknown): value is SendNowResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Record<string, unknown>;
  return (
    typeof response.success === 'boolean' &&
    typeof response.message === 'string' &&
    typeof response.time === 'string'
  );
}

function getResponseBodyAsUnknown(value: unknown) {
  return value;
}

describe('TelegramAlertService (e2e)', () => {
  let app: INestApplication<App>;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChatId = process.env.TELEGRAM_CHAT_ID;
  const previousTimezone = process.env.ALERT_TIMEZONE;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    process.env.DATABASE_URL = ':memory:';
    process.env.TELEGRAM_BOT_TOKEN = '123456789:test-token';
    process.env.TELEGRAM_CHAT_ID = '-1001234567890';
    process.env.ALERT_TIMEZONE = 'Asia/Phnom_Penh';

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('ok'),
    } as Response) as jest.MockedFunction<typeof fetch>;

    global.fetch = fetchMock;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    if (previousBotToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = previousBotToken;
    }

    if (previousChatId === undefined) {
      delete process.env.TELEGRAM_CHAT_ID;
    } else {
      process.env.TELEGRAM_CHAT_ID = previousChatId;
    }

    if (previousTimezone === undefined) {
      delete process.env.ALERT_TIMEZONE;
    } else {
      process.env.ALERT_TIMEZONE = previousTimezone;
    }

    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends a formatted HTML message with sendNow(6pm)', async () => {
    const service = app.get(TelegramAlertService);
    await service.sendNow('6pm');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.telegram.org/bot123456789:test-token/sendMessage',
    );
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toEqual({
      'Content-Type': 'application/json',
    });

    const requestBody = getPayloadFromRequestInit(requestInit);
    expect(requestBody.chat_id).toBe('-1001234567890');
    expect(requestBody.parse_mode).toBe('HTML');
    expect(requestBody.text).toContain('<b>Scheduled Reminder</b>');
    expect(requestBody.text).toContain('Time slot: <b>6:00 PM</b>');
  });

  it('sends a formatted HTML message with sendNow(9pm)', async () => {
    const service = app.get(TelegramAlertService);
    await service.sendNow('9pm');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBody = getPayloadFromRequestInit(requestInit);
    expect(requestBody.parse_mode).toBe('HTML');
    expect(requestBody.text).toContain('Time slot: <b>9:00 PM</b>');
  });

  it('triggers alert via POST /alerts/send-now', async () => {
    const response = await request(app.getHttpServer())
      .post('/alerts/send-now?time=6pm')
      .expect(201);

    const body = getResponseBodyAsUnknown(response.body);
    expect(isSendNowResponse(body)).toBe(true);
    if (!isSendNowResponse(body)) {
      throw new Error('Unexpected send-now response shape');
    }

    expect(body.success).toBe(true);
    expect(body.time).toBe('6pm');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid alert time', async () => {
    await request(app.getHttpServer())
      .post('/alerts/send-now?time=invalid')
      .expect(400);
  });
});
