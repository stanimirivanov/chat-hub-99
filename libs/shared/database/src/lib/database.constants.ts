export const WORKSPACE_STATUSES = ['active', 'archived'] as const;

export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'removed'] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const WORKSPACE_ROLES = ['owner', 'member'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const CHANNEL_STATUSES = ['active', 'archived'] as const;

export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

export const MESSAGE_STATUSES = ['active', 'deleted'] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
