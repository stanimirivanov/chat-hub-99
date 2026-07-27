import type { Layer } from 'effect';
import type { MessageRepository } from '@chat-hub/application/message';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

const layer = makeApplicationInfrastructureLayer({
  url: 'http://127.0.0.1:54321',
  publishableKey: 'test-publishable-key',
});

const completeLayer: Layer.Layer<MessageRepository, never, never> = layer;

void completeLayer;
