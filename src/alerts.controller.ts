import {
  BadRequestException,
  Controller,
  InternalServerErrorException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { API_KEY_HEADER, ApiKeyGuard } from '@/auth/api-key.guard';
import { TelegramAlertService } from '@/telegram-alert.service';

type AlertQueryTime = '6pm' | '9pm';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly telegramAlertService: TelegramAlertService) {}

  @Post('send-now')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Send Telegram alert immediately' })
  @ApiHeader({
    name: API_KEY_HEADER,
    required: true,
    description: 'Admin API key used to authorize alert triggers.',
  })
  @ApiQuery({
    name: 'time',
    required: true,
    enum: ['6pm', '9pm'],
    description: 'Choose which alert time-slot to send now.',
  })
  @ApiResponse({
    status: 201,
    description: 'Telegram alert sent successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time query. Allowed values: 6pm or 9pm.',
  })
  @ApiResponse({
    status: 500,
    description: 'Alert could not be sent due to Telegram or config error.',
  })
  async sendNow(@Query('time') time: string) {
    if (!this.isValidTime(time)) {
      throw new BadRequestException('time must be one of: 6pm, 9pm');
    }

    const result = await this.telegramAlertService.sendNow(time);
    if (!result.sent) {
      throw new InternalServerErrorException(result.detail);
    }

    return {
      success: true,
      message: result.detail,
      time,
    };
  }

  private isValidTime(time: string): time is AlertQueryTime {
    return time === '6pm' || time === '9pm';
  }
}
