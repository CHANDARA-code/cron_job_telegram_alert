import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const TELEGRAM_PARSE_MODES = ['HTML', 'MarkdownV2'] as const;
export type TelegramParseMode = (typeof TELEGRAM_PARSE_MODES)[number];

export class CreateScheduleDto {
  @ApiProperty({ example: 'Evening reminder' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '0 18 * * *' })
  @IsString()
  @IsNotEmpty()
  cronExpression!: string;

  @ApiProperty({ example: 'Asia/Phnom_Penh', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timezone?: string;

  @ApiProperty({
    example: '<b>Do something now.</b>',
    description: 'Telegram text body.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    example: 'HTML',
    required: false,
    enum: TELEGRAM_PARSE_MODES,
  })
  @IsOptional()
  @IsIn(TELEGRAM_PARSE_MODES)
  parseMode?: TelegramParseMode;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
