/**
 * Raw values accepted from the current-profile editing boundary.
 *
 * Optional username and avatar values may be omitted, null, or blank. The use
 * case normalizes all three representations to domain absence.
 */
export interface UpdateCurrentProfileInput {
  readonly displayName: string;
  readonly username?: string | null;
  readonly avatarUrl?: string | null;
}
