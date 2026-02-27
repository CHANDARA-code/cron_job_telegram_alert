import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiKeyGuard } from '@/auth/api-key.guard';
import { EnvValidationService } from '@/config/env-validation.service';
import { DatabaseModule } from '@db/database.module';
import { HealthModule } from '@/health/health.module';
import { MetricsModule } from '@/metrics/metrics.module';
import { AlertsController } from '@/alerts.controller';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { SchedulesModule } from '@schedules/schedules.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    MetricsModule,
    HealthModule,
    SchedulesModule,
  ],
  controllers: [AppController, AlertsController],
  providers: [AppService, EnvValidationService, ApiKeyGuard],
})
export class AppModule {}
