import type { Layer } from 'effect';
import type { AuthenticationService } from '@omoikane/application/authentication';
import type { ChannelRepository } from '@omoikane/application/channel';
import type { MessageRepository } from '@omoikane/application/message';
import type { ProfileRepository } from '@omoikane/application/profile';
import type { WorkspaceRepository } from '@omoikane/application/workspace';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

const layer = makeApplicationInfrastructureLayer({
  url: 'http://127.0.0.1:54321',
  publishableKey: 'test-publishable-key',
});

const completeLayer: Layer.Layer<
  | MessageRepository
  | AuthenticationService
  | ChannelRepository
  | ProfileRepository
  | WorkspaceRepository,
  never,
  never
> = layer;

void completeLayer;
