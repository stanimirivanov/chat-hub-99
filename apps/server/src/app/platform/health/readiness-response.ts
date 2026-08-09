import { ApiProperty } from '@nestjs/swagger';

/** Public response returned after all active critical dependencies are ready. */
export class ReadinessResponse {
  @ApiProperty({ example: 'ok' })
  readonly status = 'ok' as const;

  @ApiProperty({ example: { supabaseAuth: 'ok' } })
  readonly checks = { supabaseAuth: 'ok' } as const;
}
