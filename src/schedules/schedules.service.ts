import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, validateCronExpression } from 'cron';
import { desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '@db/database.constants';
import type { DrizzleDatabase } from '@db/database.types';
import {
  schedules,
  type NewScheduleRecord,
  type ScheduleRecord,
} from '@db/schema';
import {
  type AlertSendResult,
  TelegramAlertService,
} from '@/telegram-alert.service';
import {
  type TelegramParseMode,
  CreateScheduleDto,
} from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

const DEFAULT_TIMEZONE = 'Asia/Phnom_Penh';
const DEFAULT_PARSE_MODE: TelegramParseMode = 'HTML';

@Injectable()
export class SchedulesService implements OnModuleInit {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly telegramAlertService: TelegramAlertService,
  ) {}

  onModuleInit() {
    this.ensureDefaultSchedules();
    this.syncCronJobsFromDatabase();
  }

  findAll(): ScheduleRecord[] {
    return this.db
      .select()
      .from(schedules)
      .orderBy(desc(schedules.createdAt))
      .all();
  }

  listCreated(): ScheduleRecord[] {
    return this.findAll();
  }

  findOne(id: number): ScheduleRecord {
    return this.findScheduleOrThrow(id);
  }

  create(dto: CreateScheduleDto): ScheduleRecord {
    this.validateCron(dto.cronExpression);
    this.validateTimezone(dto.timezone ?? DEFAULT_TIMEZONE);

    const created = this.db
      .insert(schedules)
      .values({
        name: dto.name,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone ?? DEFAULT_TIMEZONE,
        message: dto.message,
        parseMode: dto.parseMode ?? DEFAULT_PARSE_MODE,
        isActive: dto.isActive ?? true,
      })
      .returning()
      .get();

    if (!created) {
      throw new BadRequestException('Could not create schedule.');
    }

    if (created.isActive) {
      this.registerCronJob(created.id);
    }

    return created;
  }

  update(id: number, dto: UpdateScheduleDto): ScheduleRecord {
    const existing = this.findScheduleOrThrow(id);

    const cronExpression = dto.cronExpression ?? existing.cronExpression;
    const timezone = dto.timezone ?? existing.timezone;
    this.validateCron(cronExpression);
    this.validateTimezone(timezone);

    const values: Partial<NewScheduleRecord> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.cronExpression !== undefined)
      values.cronExpression = dto.cronExpression;
    if (dto.timezone !== undefined) values.timezone = dto.timezone;
    if (dto.message !== undefined) values.message = dto.message;
    if (dto.parseMode !== undefined) values.parseMode = dto.parseMode;
    if (dto.isActive !== undefined) values.isActive = dto.isActive;

    const updated = this.db
      .update(schedules)
      .set(values)
      .where(eq(schedules.id, id))
      .returning()
      .get();

    if (!updated) {
      throw new NotFoundException(`Schedule with id ${id} not found.`);
    }

    this.unregisterCronJob(id);
    if (updated.isActive) {
      this.registerCronJob(id);
    }

    return updated;
  }

  remove(id: number): { success: boolean; id: number; message: string } {
    this.findScheduleOrThrow(id);
    this.unregisterCronJob(id);
    this.db.delete(schedules).where(eq(schedules.id, id)).run();

    return {
      success: true,
      id,
      message: 'Schedule deleted.',
    };
  }

  async sendNow(id: number): Promise<AlertSendResult> {
    const schedule = this.findScheduleOrThrow(id);
    const result = await this.telegramAlertService.sendMessage(
      schedule.message,
      schedule.parseMode as TelegramParseMode,
    );

    if (result.sent) {
      this.markScheduleSendSuccess(id);
    } else {
      this.markScheduleSendFailure(id, result.detail);
    }

    return result;
  }

  private ensureDefaultSchedules() {
    const existing = this.db.select().from(schedules).limit(1).all();
    if (existing.length > 0) {
      return;
    }

    const defaultMessage = '<b>Do something now.</b>';
    this.db
      .insert(schedules)
      .values([
        {
          name: 'Default 6 PM Alert',
          cronExpression: '0 18 * * *',
          timezone: DEFAULT_TIMEZONE,
          message: defaultMessage,
          parseMode: 'HTML',
          isActive: true,
        },
        {
          name: 'Default 9 PM Alert',
          cronExpression: '0 21 * * *',
          timezone: DEFAULT_TIMEZONE,
          message: defaultMessage,
          parseMode: 'HTML',
          isActive: true,
        },
      ])
      .run();

    this.logger.log('Seeded default schedules (6 PM and 9 PM).');
  }

  private syncCronJobsFromDatabase() {
    const allSchedules = this.findAll();
    for (const schedule of allSchedules) {
      if (schedule.isActive) {
        this.registerCronJob(schedule.id);
      }
    }
  }

  private registerCronJob(id: number) {
    const schedule = this.findScheduleOrThrow(id);
    const jobName = this.getJobName(id);
    this.unregisterCronJob(id);

    const job = CronJob.from({
      cronTime: schedule.cronExpression,
      timeZone: schedule.timezone,
      onTick: () => {
        void this.runScheduledJob(id);
      },
      start: false,
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
    this.logger.log(`Registered schedule #${id} (${schedule.cronExpression}).`);
  }

  private unregisterCronJob(id: number) {
    const jobName = this.getJobName(id);
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      const job = this.schedulerRegistry.getCronJob(jobName);
      void job.stop();
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }

  private async runScheduledJob(id: number) {
    try {
      const schedule = this.findScheduleOrThrow(id);
      const result = await this.telegramAlertService.sendMessage(
        schedule.message,
        schedule.parseMode as TelegramParseMode,
      );

      if (result.sent) {
        this.markScheduleSendSuccess(id);
        return;
      }

      this.markScheduleSendFailure(id, result.detail);
      this.logger.error(
        `Schedule #${id} failed to send Telegram message: ${result.detail}`,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown scheduled job error.';
      this.markScheduleSendFailure(id, detail);
      this.logger.error(`Schedule #${id} failed with exception: ${detail}`);
    }
  }

  private markScheduleSendSuccess(id: number) {
    const now = new Date();
    this.db
      .update(schedules)
      .set({
        updatedAt: now,
        lastRunAt: now,
        lastSentAt: now,
        lastStatus: 'SUCCESS',
        lastError: null,
        failureCount: 0,
      })
      .where(eq(schedules.id, id))
      .run();
  }

  private markScheduleSendFailure(id: number, detail: string) {
    const now = new Date();
    this.db
      .update(schedules)
      .set({
        updatedAt: now,
        lastRunAt: now,
        lastStatus: 'FAILED',
        lastError: detail,
        failureCount: sql`${schedules.failureCount} + 1`,
      })
      .where(eq(schedules.id, id))
      .run();
  }

  private findScheduleById(id: number): ScheduleRecord | undefined {
    return this.db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1)
      .get();
  }

  private findScheduleOrThrow(id: number): ScheduleRecord {
    const schedule = this.findScheduleById(id);

    if (!schedule) {
      throw new NotFoundException(`Schedule with id ${id} not found.`);
    }

    return schedule;
  }

  private validateCron(cronExpression: string) {
    const validation = validateCronExpression(cronExpression);
    if (!validation.valid) {
      throw new BadRequestException(
        `Invalid cron expression: ${cronExpression}`,
      );
    }
  }

  private validateTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(
        new Date(),
      );
    } catch {
      throw new BadRequestException(`Invalid timezone: ${timezone}`);
    }
  }

  private getJobName(id: number) {
    return `schedule-${id}`;
  }
}
