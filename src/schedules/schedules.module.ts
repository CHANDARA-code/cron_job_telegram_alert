import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '@/auth/api-key.guard';
import { MetricsModule } from '@/metrics/metrics.module';
import { TelegramAlertService } from '@/telegram-alert.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [MetricsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, TelegramAlertService, ApiKeyGuard],
  exports: [SchedulesService, TelegramAlertService],
})
export class SchedulesModule {}
