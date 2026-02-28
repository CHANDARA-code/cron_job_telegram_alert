import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

type LiveResponse = {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
};

type ReadyResponse = {
  status: string;
  checks: {
    env: { ok: boolean };
    database: { ok: boolean };
  };
};

type ApiEnvelope<T> = {
  message?: string;
  data?: T;
  code: number;
  expextion?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isApiEnvelope<T>(
  value: unknown,
  dataGuard?: (input: unknown) => input is T,
): value is ApiEnvelope<T> {
  if (!isRecord(value) || typeof value.code !== 'number') {
    return false;
  }

  if (!('data' in value) || !dataGuard) {
    return true;
  }

  return dataGuard(value.data);
}

function isLiveResponse(value: unknown): value is LiveResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.status === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.uptimeSeconds === 'number'
  );
}

function isReadyResponse(value: unknown): value is ReadyResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.status !== 'string' || !isRecord(value.checks)) {
    return false;
  }

  const { env, database } = value.checks;
  return (
    isRecord(env) &&
    isRecord(database) &&
    typeof env.ok === 'boolean' &&
    typeof database.ok === 'boolean'
  );
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChatId = process.env.TELEGRAM_CHAT_ID;
  const previousTimezone = process.env.ALERT_TIMEZONE;
  const previousAdminApiKey = process.env.ADMIN_API_KEY;

  beforeEach(async () => {
    process.env.DATABASE_URL = ':memory:';
    process.env.TELEGRAM_BOT_TOKEN = '123456789:test-token';
    process.env.TELEGRAM_CHAT_ID = '-1001234567890';
    process.env.ALERT_TIMEZONE = 'Asia/Phnom_Penh';
    process.env.ADMIN_API_KEY = 'test-admin-key';

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

    if (previousAdminApiKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = previousAdminApiKey;
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        const body: unknown = response.body;
        expect(isApiEnvelope<string>(body)).toBe(true);
        if (!isApiEnvelope<string>(body)) {
          throw new Error('Unexpected / response envelope.');
        }

        expect(body.code).toBe(200);
        expect(body.data).toBe('Hello World!');
      });
  });

  it('/health/live (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    const body: unknown = response.body;
    expect(isApiEnvelope<LiveResponse>(body, isLiveResponse)).toBe(true);
    if (!isApiEnvelope<LiveResponse>(body, isLiveResponse) || !body.data) {
      throw new Error('Unexpected /health/live response envelope.');
    }

    expect(body.code).toBe(200);
    expect(body.data.status).toBe('ok');
    expect(typeof body.data.timestamp).toBe('string');
    expect(typeof body.data.uptimeSeconds).toBe('number');
  });

  it('/health/ready (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    const body: unknown = response.body;
    expect(isApiEnvelope<ReadyResponse>(body, isReadyResponse)).toBe(true);
    if (!isApiEnvelope<ReadyResponse>(body, isReadyResponse) || !body.data) {
      throw new Error('Unexpected /health/ready response envelope.');
    }

    expect(body.code).toBe(200);
    expect(body.data.status).toBe('ready');
    expect(body.data.checks.env.ok).toBe(true);
    expect(body.data.checks.database.ok).toBe(true);
  });

  it('/metrics (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.header['content-type']).toContain('text/plain');
    expect(response.text).toContain('telegram_alert_send_total');
    expect(response.text).toContain('telegram_alert_send_retry_total');
  });
});
