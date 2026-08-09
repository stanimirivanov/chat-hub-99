import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './platform/authentication/access-token.guard';
import { serverConfigProvider } from './platform/configuration/server-config.provider';
import { ServerEffectRuntime } from './platform/effect-runtime/server-effect-runtime.service';
import { HealthController } from './platform/health/health.controller';
import { ProblemDetailsFilter } from './platform/http/problem-details.filter';
import { ServerTelemetry } from './platform/observability/server-telemetry.service';
import { serverTelemetrySinksProvider } from './platform/observability/server-telemetry-sinks';
import { AnalysisRunsController } from './analysis-runs/analysis-runs.controller';

/** Root composition module for the Omoikane modular application server. */
@Module({
  controllers: [HealthController, AnalysisRunsController],
  providers: [
    serverConfigProvider,
    serverTelemetrySinksProvider,
    ServerTelemetry,
    ServerEffectRuntime,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class ServerModule {}
