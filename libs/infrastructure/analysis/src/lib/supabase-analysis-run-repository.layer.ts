import { Effect, Layer } from 'effect';
import { AnalysisRunRepositoryTag } from '@omoikane/application/analysis';
import { SupabaseAnalysisClientTag } from './supabase-analysis-client';
import { makeSupabaseAnalysisRunRepository } from './supabase-analysis-run-repository';

/** Supplies the application repository from the focused privileged RPC client. */
export const SupabaseAnalysisRunRepositoryLayer = Layer.effect(
  AnalysisRunRepositoryTag,
  Effect.map(SupabaseAnalysisClientTag, makeSupabaseAnalysisRunRepository)
);
