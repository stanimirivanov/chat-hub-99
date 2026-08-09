import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Effect, Either } from 'effect';
import { checkAccessTokenValidationAvailability } from '@omoikane/application/authentication';
import { SERVER_CONFIG } from '../configuration/server-config.provider';
import type { ServerConfig } from '../configuration/server-config';
import { ServerEffectRuntime } from '../effect-runtime/server-effect-runtime.service';
import { authenticationUnavailable } from '../http/http-boundary-error';
import { PublicRoute } from '../http/public-route';
import { LivenessResponse } from './liveness-response';
import { ReadinessResponse } from './readiness-response';

/** Exposes process health without coupling liveness to downstream services. */
@ApiTags('health')
@PublicRoute()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(SERVER_CONFIG) private readonly serverConfig: ServerConfig,
    private readonly runtime: ServerEffectRuntime
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Report process liveness' })
  @ApiOkResponse({ type: LivenessResponse })
  liveness(): LivenessResponse {
    return new LivenessResponse(this.serverConfig.version);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Report readiness of active critical dependencies' })
  @ApiOkResponse({ type: ReadinessResponse })
  @ApiServiceUnavailableResponse({
    description: 'Supabase Auth is unavailable.',
  })
  async readiness(): Promise<ReadinessResponse> {
    const result = await this.runtime.runPromise(
      checkAccessTokenValidationAvailability.pipe(Effect.either)
    );

    if (Either.isLeft(result)) {
      throw authenticationUnavailable();
    }

    return new ReadinessResponse();
  }
}
