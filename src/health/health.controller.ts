import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive.' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (env + database)' })
  @ApiResponse({ status: 200, description: 'Service is ready.' })
  @ApiResponse({ status: 503, description: 'Service is not ready.' })
  getReadiness(@Res({ passthrough: true }) response: Response) {
    const readiness = this.healthService.getReadiness();
    if (readiness.status !== 'ready') {
      response.status(503);
    }

    return readiness;
  }
}
