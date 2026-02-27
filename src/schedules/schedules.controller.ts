import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a schedule' })
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
  @ApiOperation({ summary: 'Update schedule' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Schedule updated.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Schedule deleted.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.remove(id);
  }

  @Post(':id/send-now')
  @ApiOperation({ summary: 'Send this schedule message immediately' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Message sent result.' })
  sendNow(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.sendNow(id);
  }
}
