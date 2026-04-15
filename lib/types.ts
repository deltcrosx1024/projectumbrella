// Shared type definitions used across frontend forms and API payloads.
export type ModerationLevel = 'low' | 'medium' | 'high';

export type DiscordConfig = {
  guildId?: string;
  autoModEnabled: boolean;
  moderationLevel: ModerationLevel;
  safeWords: string[];
  adminRoleId?: string;
};

export type FeatureCard = {
  title: string;
  description: string;
};
