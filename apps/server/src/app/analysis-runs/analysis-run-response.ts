import { ApiProperty } from '@nestjs/swagger';
import type { AnalysisRun, AnalysisRunStatus } from '@omoikane/domain/analysis';

/** HTTP serialization of the supported deterministic Analysis Run state. */
export class AnalysisRunResponse {
  @ApiProperty({ format: 'uuid' }) readonly id: string;
  @ApiProperty({ format: 'uuid' }) readonly workspaceId: string;
  @ApiProperty({ format: 'uuid' }) readonly requestedBy: string;
  @ApiProperty({
    enum: ['created', 'queued', 'running', 'succeeded', 'failed'],
  })
  readonly status: AnalysisRunStatus;
  @ApiProperty({ nullable: true, example: 'provider.timeout' })
  readonly failureCategory: string | null;
  @ApiProperty({ format: 'date-time' }) readonly createdAt: string;

  constructor(run: AnalysisRun) {
    this.id = run.id;
    this.workspaceId = run.workspaceId;
    this.requestedBy = run.requestedBy;
    this.status = run.status;
    this.failureCategory = run.failureCategory;
    this.createdAt = run.createdAt.toISOString();
  }
}
