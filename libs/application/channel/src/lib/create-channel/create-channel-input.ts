/**
 * Raw values accepted from the channel-creation boundary.
 */
export interface CreateChannelInput {
  readonly workspaceId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
}
