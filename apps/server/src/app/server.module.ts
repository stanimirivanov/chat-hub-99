import { Module } from '@nestjs/common';
import { serverConfigProvider } from './platform/configuration/server-config.provider';
import { ServerEffectRuntime } from './platform/effect-runtime/server-effect-runtime.service';
import { HealthController } from './platform/health/health.controller';

/** Root composition module for the Omoikane modular application server. */
@Module({
  controllers: [HealthController],
  providers: [serverConfigProvider, ServerEffectRuntime],
})
export class ServerModule {}
