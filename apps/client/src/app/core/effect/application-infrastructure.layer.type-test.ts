import type { Layer } from 'effect';
import type { AuthenticationService } from '@chat-hub/application/authentication';
import type { MessageRepository } from '@chat-hub/application/message';
import type { WorkspaceRepository } from '@chat-hub/application/workspace';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

const layer = makeApplicationInfrastructureLayer({
  url: 'http://127.0.0.1:54321',
  publishableKey: 'test-publishable-key',
});

const completeLayer: Layer.Layer<
  MessageRepository | AuthenticationService | WorkspaceRepository,
  never,
  never
> = layer;

void completeLayer;
