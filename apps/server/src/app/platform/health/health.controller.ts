import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SERVER_CONFIG } from '../configuration/server-config.provider';
import type { ServerConfig } from '../configuration/server-config';
import { LivenessResponse } from './liveness-response';

/** Exposes process health without coupling liveness to downstream services. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(SERVER_CONFIG) private readonly serverConfig: ServerConfig
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Report process liveness' })
  @ApiOkResponse({ type: LivenessResponse })
  liveness(): LivenessResponse {
    return new LivenessResponse(this.serverConfig.version);
  }
}
