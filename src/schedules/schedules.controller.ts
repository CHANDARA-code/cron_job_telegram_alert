import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { API_KEY_HEADER, ApiKeyGuard } from '@/auth/api-key.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Create a schedule' })
  @ApiHeader({
    name: API_KEY_HEADER,
    required: true,
    description: 'Admin API key required for write actions.',
  })
  @ApiCreatedResponse({ description: 'Schedule created.' })
  create(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List schedules' })
  @ApiOkResponse({ description: 'Schedule list.' })
  findAll() {
    return this.schedulesService.findAll();
  }

  @Get('created')
  @ApiOperation({ summary: 'List schedules by created date (newest first)' })
  @ApiOkResponse({ description: 'Created schedules list.' })
  listCreated() {
    return this.schedulesService.listCreated();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Single schedule.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Update schedule' })
  @ApiHeader({
    name: API_KEY_HEADER,
    required: true,
    description: 'Admin API key required for write actions.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Schedule updated.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Delete schedule' })
  @ApiHeader({
    name: API_KEY_HEADER,
    required: true,
    description: 'Admin API key required for write actions.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Schedule deleted.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.remove(id);
  }

  @Post(':id/send-now')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Send this schedule message immediately' })
  @ApiHeader({
    name: API_KEY_HEADER,
    required: true,
    description: 'Admin API key required for write actions.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Message sent result.' })
  sendNow(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.sendNow(id);
  }
}
