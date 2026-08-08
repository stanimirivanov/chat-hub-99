import { Layer, Stream } from 'effect';
import {
  WorkspacePresenceServiceTag,
  type WorkspacePresenceService,
} from '../workspace-presence';

/** Creates isolated workspace-presence test support. */
export const makeWorkspacePresenceServiceLayer = (
  overrides: Partial<WorkspacePresenceService> = {}
): Layer.Layer<WorkspacePresenceService> =>
  Layer.succeed(WorkspacePresenceServiceTag, {
    observe: () =>
      Stream.die(
        new Error('Unexpected WorkspacePresenceService.observe call in test')
      ),
    ...overrides,
  });
