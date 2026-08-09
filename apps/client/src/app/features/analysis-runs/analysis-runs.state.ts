import type { AnalysisRun } from '@omoikane/domain/analysis';
import type { WorkspaceId } from '@omoikane/domain/workspace';

export interface AnalysisRunsState {
  readonly workspaceId: WorkspaceId | null;
  readonly run: AnalysisRun | null;
  readonly status: 'idle' | 'starting' | 'refreshing' | 'created' | 'failed';
  readonly error: { readonly message: string } | null;
}

export const initialAnalysisRunsState: AnalysisRunsState = {
  workspaceId: null,
  run: null,
  status: 'idle',
  error: null,
};
