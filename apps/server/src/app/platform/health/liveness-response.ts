import { ApiProperty } from '@nestjs/swagger';

/** Public, dependency-free process liveness response. */
export class LivenessResponse {
  @ApiProperty({ example: 'ok' })
  readonly status = 'ok' as const;

  @ApiProperty({ example: 'omoikane-server' })
  readonly service = 'omoikane-server' as const;

  @ApiProperty({ example: '0.1.0' })
  readonly version: string;

  constructor(version: string) {
    this.version = version;
  }
}
