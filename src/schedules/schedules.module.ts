import { Module } from '@nestjs/common';
import { TelegramAlertService } from '@/telegram-alert.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, TelegramAlertService],
  exports: [SchedulesService, TelegramAlertService],
})
export class SchedulesModule {}
