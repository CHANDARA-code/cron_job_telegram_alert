import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';

type ScheduleApiModel = {
  id: number;
  name: string;
  cronExpression: string;
  timezone: string;
  message: string;
  parseMode: string;
  isActive: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isSchedule(value: unknown): value is ScheduleApiModel {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.cronExpression === 'string' &&
    typeof value.timezone === 'string' &&
    typeof value.message === 'string' &&
    typeof value.parseMode === 'string' &&
    typeof value.isActive === 'boolean'
  );
}

function isScheduleList(value: unknown): value is ScheduleApiModel[] {
  return Array.isArray(value) && value.every((item) => isSchedule(item));
}

function isDeleteResponse(value: unknown): value is { success: boolean } {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.success === 'boolean';
}

describe('SchedulesController (e2e)', () => {
  let app: INestApplication<App>;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  const adminApiKey = 'test-admin-key';

  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChatId = process.env.TELEGRAM_CHAT_ID;
  const previousTimezone = process.env.ALERT_TIMEZONE;
  const previousAdminApiKey = process.env.ADMIN_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    process.env.DATABASE_URL = ':memory:';
    process.env.TELEGRAM_BOT_TOKEN = '123456789:test-token';
    process.env.TELEGRAM_CHAT_ID = '-1001234567890';
    process.env.ALERT_TIMEZONE = 'Asia/Phnom_Penh';
    process.env.ADMIN_API_KEY = adminApiKey;

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

    if (previousAdminApiKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = previousAdminApiKey;
    }

    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('supports schedule CRUD and list created schedules', async () => {
    const createdListResponse = await request(app.getHttpServer())
      .get('/schedules/created')
      .expect(200);

    const createdListBody: unknown = createdListResponse.body;
    expect(isScheduleList(createdListBody)).toBe(true);
    if (!isScheduleList(createdListBody)) {
      throw new Error('Expected /schedules/created to return a list.');
    }
    expect(createdListBody.length).toBeGreaterThanOrEqual(2);

    const createResponse = await request(app.getHttpServer())
      .post('/schedules')
      .set('x-api-key', adminApiKey)
      .send({
        name: 'Lunch reminder',
        cronExpression: '0 12 * * *',
        timezone: 'Asia/Phnom_Penh',
        message: '<b>Lunch time</b>',
        parseMode: 'HTML',
        isActive: true,
      })
      .expect(201);

    const createBody: unknown = createResponse.body;
    expect(isSchedule(createBody)).toBe(true);
    if (!isSchedule(createBody)) {
      throw new Error('Expected created schedule object.');
    }
    expect(createBody.name).toBe('Lunch reminder');

    const scheduleId = createBody.id;

    await request(app.getHttpServer())
      .patch(`/schedules/${scheduleId}`)
      .set('x-api-key', adminApiKey)
      .send({ message: '<b>Updated lunch</b>', isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/schedules/${scheduleId}/send-now`)
      .set('x-api-key', adminApiKey)
      .expect(201);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/schedules/${scheduleId}`)
      .set('x-api-key', adminApiKey)
      .expect(200);

    const deleteBody: unknown = deleteResponse.body;
    expect(isDeleteResponse(deleteBody)).toBe(true);
    if (!isDeleteResponse(deleteBody)) {
      throw new Error('Expected delete response payload.');
    }
    expect(deleteBody.success).toBe(true);

    await request(app.getHttpServer())
      .get(`/schedules/${scheduleId}`)
      .expect(404);
  });

  it('rejects invalid parseMode in create schedule payload', async () => {
    await request(app.getHttpServer())
      .post('/schedules')
      .set('x-api-key', adminApiKey)
      .send({
        name: 'Invalid mode',
        cronExpression: '0 8 * * *',
        timezone: 'Asia/Phnom_Penh',
        message: 'hello',
        parseMode: 'Markdown',
      })
      .expect(400);
  });

  it('rejects invalid cron expression in create schedule payload', async () => {
    await request(app.getHttpServer())
      .post('/schedules')
      .set('x-api-key', adminApiKey)
      .send({
        name: 'Invalid cron',
        cronExpression: 'not-a-cron',
        timezone: 'Asia/Phnom_Penh',
        message: 'hello',
        parseMode: 'HTML',
      })
      .expect(400);
  });

  it('rejects invalid timezone in create schedule payload', async () => {
    await request(app.getHttpServer())
      .post('/schedules')
      .set('x-api-key', adminApiKey)
      .send({
        name: 'Invalid timezone',
        cronExpression: '0 10 * * *',
        timezone: 'Mars/Phobos',
        message: 'hello',
        parseMode: 'HTML',
      })
      .expect(400);
  });

  it('rejects non-whitelisted fields in create schedule payload', async () => {
    await request(app.getHttpServer())
      .post('/schedules')
      .set('x-api-key', adminApiKey)
      .send({
        name: 'Unknown field test',
        cronExpression: '0 10 * * *',
        timezone: 'Asia/Phnom_Penh',
        message: 'hello',
        parseMode: 'HTML',
        hacked: true,
      })
      .expect(400);
  });

  it('rejects create schedule request when x-api-key is missing', async () => {
    await request(app.getHttpServer())
      .post('/schedules')
      .send({
        name: 'No auth',
        cronExpression: '0 10 * * *',
        timezone: 'Asia/Phnom_Penh',
        message: 'hello',
      })
      .expect(401);
  });
});
