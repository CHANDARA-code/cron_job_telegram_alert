import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlertsController } from './alerts.controller';
import { TelegramAlertService } from './telegram-alert.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController, AlertsController],
  providers: [AppService, TelegramAlertService],
})
export class AppModule {}
