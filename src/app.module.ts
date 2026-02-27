import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@db/database.module';
import { AlertsController } from '@/alerts.controller';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { SchedulesModule } from '@schedules/schedules.module';

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, SchedulesModule],
  controllers: [AppController, AlertsController],
  providers: [AppService],
})
export class AppModule {}
