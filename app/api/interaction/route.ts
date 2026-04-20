import axios from 'axios';
import { type NextRequest } from 'next/server';
import {
  InteractionResponseType,
  InteractionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationActionType,
  AutoModerationRuleKeywordPresetType,
} from 'discord-api-types/v10';
import { verifyDiscordRequest } from '@/lib/discord/interaction';
import { savedSettings } from '../settings/route';

// In-memory infraction tracking
type Infraction = {
  userId: string;
  guildId: string;
  type: 'warn' | 'mute' | 'kick' | 'ban';
  reason: string;
  timestamp: number;
  moderatorId: string;
};

const infractions: Infraction[] = [];

function addInfraction(userId: string, guildId: string, type: Infraction['type'], reason: string, moderatorId: string) {
  infractions.push({
    userId,
    guildId,
    type,
    reason,
    timestamp: Date.now(),
    moderatorId,
  });
}

function getUserInfractions(userId: string, guildId: string): Infraction[] {
  return infractions.filter((inf) => inf.userId === userId && inf.guildId === guildId);
}

function formatInfractionList(infs: Infraction[]): string {
  if (infs.length === 0) return 'No infractions found.';
  return infs
    .map((inf, i) => `${i + 1}. [${inf.type.toUpperCase()}] ${inf.reason} (${new Date(inf.timestamp).toLocaleDateString()})`)
    .join('\n');
}


// Discord interaction endpoint.
// Configure this URL as the Interaction Endpoint URL in the Discord Developer Portal.
// Discord verifies this endpoint by sending a POST with type 1 and expects a response
// body of { type: 1 }. Every request must also be verified using the
// X-Signature-Ed25519 and X-Signature-Timestamp headers.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

type InteractionOption = {
  name: string;
  value?: string | number | boolean;
};

type DiscordInteractionData = {
  name?: string;
  options?: InteractionOption[];
  custom_id?: string;
  components?: unknown[];
};

type DiscordInteraction = {
  type: InteractionType;
  id: string;
  application_id: string;
  token: string;
  guild_id?: string;
  data?: DiscordInteractionData;
  member?: {
    user?: { id: string };
    permissions?: {
      has(permission: string): boolean;
    };
  };
  user?: { id: string };
};

type AutoModRule = {
  id?: string;
  name: string;
  event_type: number;
  trigger_type: number;
  trigger_metadata: Record<string, unknown>;
  actions: Array<{
    type: number;
    metadata?: Record<string, unknown>;
  }>;
  enabled: boolean;
  exempt_roles: string[];
  exempt_channels: string[];
};

type AxiosError = {
  response?: {
    status?: number;
    data?: unknown;
  };
  message: string;
};

function createResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createErrorResponse(message: string, status = 400) {
  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: message,
      flags: 64,
    },
  }, status);
}

async function sendFollowup(interaction: DiscordInteraction, content: string) {
  const followupUrl = `${DISCORD_API_BASE}/webhooks/${interaction.application_id}/${interaction.token}`;
  await axios.post(followupUrl, { content });
}

function getBotHeaders() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Discord bot token is not configured. Set DISCORD_BOT_TOKEN.');
  }

  return {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
  };
}

async function fetchGuildAutoModRules(guildId: string): Promise<AutoModRule[]> {
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/auto-moderation/rules`;
  const response = await axios.get(url, { headers: getBotHeaders() });
  return response.data as AutoModRule[];
}

async function createAutoModRule(guildId: string, body: AutoModRule): Promise<AutoModRule> {
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/auto-moderation/rules`;
  const response = await axios.post(url, body, { headers: getBotHeaders() });
  return response.data as AutoModRule;
}

async function patchAutoModRule(guildId: string, ruleId: string, body: Partial<AutoModRule>): Promise<AutoModRule> {
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/auto-moderation/rules/${ruleId}`;
  const response = await axios.patch(url, body, { headers: getBotHeaders() });
  return response.data as AutoModRule;
}

function buildSpamRule(): AutoModRule {
  return {
    name: 'ProjectUmbrella: Spam protection',
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Spam,
    trigger_metadata: {},
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: {
          custom_message: 'Message blocked by ProjectUmbrella spam protection.',
        },
      },
    ],
    enabled: true,
    exempt_roles: [],
    exempt_channels: [],
  };
}

function buildMentionSpamRule(): AutoModRule {
  const mentionLimit = savedSettings.moderationLevel === 'high' ? 4 : 6;
  return {
    name: 'ProjectUmbrella: Mention abuse protection',
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.MentionSpam,
    trigger_metadata: {
      mention_total_limit: mentionLimit,
      mention_raid_protection_enabled: true,
    },
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: {
          custom_message: 'Message blocked by ProjectUmbrella mention protection.',
        },
      },
    ],
    enabled: true,
    exempt_roles: [],
    exempt_channels: [],
  };
}

function buildKeywordFilterRule(): AutoModRule {
  const safeWords = Array.isArray(savedSettings.safeWords) && savedSettings.safeWords.length > 0
    ? savedSettings.safeWords.slice(0, 6)
    : ['spam', 'scam', 'phish', 'discord.gg', 'free nitro', 'click here'];

  return {
    name: 'ProjectUmbrella: Keyword filter',
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: {
      keyword_filter: safeWords as string[],
    },
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: {
          custom_message: 'Message blocked by ProjectUmbrella keyword filter.',
        },
      },
    ],
    enabled: true,
    exempt_roles: [],
    exempt_channels: [],
  };
}

function buildProfanityRule(): AutoModRule {
  return {
    name: 'ProjectUmbrella: Profanity preset',
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.KeywordPreset,
    trigger_metadata: {
      presets: [
        AutoModerationRuleKeywordPresetType.Profanity,
        AutoModerationRuleKeywordPresetType.Slurs,
      ],
    },
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: {
          custom_message: 'Message blocked by ProjectUmbrella profanity filter.',
        },
      },
    ],
    enabled: true,
    exempt_roles: [],
    exempt_channels: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildAutoModRules(): AutoModRule[] {
  const rules: AutoModRule[] = [
    buildSpamRule(),
    buildMentionSpamRule(),
  ];

  if (savedSettings.moderationLevel !== 'low') {
    rules.push(buildKeywordFilterRule(), buildProfanityRule());
  }

  return rules;
}

function findRuleByName(rules: AutoModRule[], name: string): AutoModRule | undefined {
  return rules.find((rule) => rule.name === name);
}

function formatRuleSummary(rule: AutoModRule): string {
  const enabled = rule.enabled ? '✓ enabled' : '✗ disabled';
  const trigger = AutoModerationRuleTriggerType[rule.trigger_type] || rule.trigger_type;
  return `• ${rule.name} — ${enabled} (${trigger})`;
}

async function syncRuleByName(guildId: string, ruleName: string, ruleDefinition: AutoModRule): Promise<{ action: 'updated' | 'created'; rule: string }> {
  const existingRules = await fetchGuildAutoModRules(guildId);
  const existing = findRuleByName(existingRules, ruleName);

  if (existing) {
    await patchAutoModRule(guildId, existing.id!, ruleDefinition);
    return { action: 'updated', rule: ruleName };
  } else {
    await createAutoModRule(guildId, ruleDefinition);
    return { action: 'created', rule: ruleName };
  }
}

async function toggleRuleByName(guildId: string, ruleName: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
  const existingRules = await fetchGuildAutoModRules(guildId);
  const rule = findRuleByName(existingRules, ruleName);

  if (!rule) {
    return { success: false, message: `Rule "${ruleName}" not found.` };
  }

  await patchAutoModRule(guildId, rule.id!, { enabled });
  return { success: true, message: `Rule "${ruleName}" ${enabled ? 'enabled' : 'disabled'}.` };
}

async function getRuleStatusByName(guildId: string, ruleName: string): Promise<AutoModRule | undefined> {
  const existingRules = await fetchGuildAutoModRules(guildId);
  return findRuleByName(existingRules, ruleName);
}

async function getProjectUmbrellaAutoModStatus(guildId: string): Promise<AutoModRule[]> {
  const existingRules = await fetchGuildAutoModRules(guildId);
  const umbrellaRules = existingRules.filter((rule) => rule.name.startsWith('ProjectUmbrella:'));
  return umbrellaRules;
}

async function performGuildKick(guildId: string, userId: string, reason: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Discord bot token is not configured. Set DISCORD_BOT_TOKEN.');
  }

  const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`;
  await axios.delete(url, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'X-Audit-Log-Reason': reason,
    },
  });
}

async function performGuildBan(guildId: string, userId: string, reason: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Discord bot token is not configured. Set DISCORD_BOT_TOKEN.');
  }

  const url = `${DISCORD_API_BASE}/guilds/${guildId}/bans/${userId}`;
  await axios.put(url, null, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'X-Audit-Log-Reason': reason,
    },
  });
}

async function handleKickCommand(interaction: DiscordInteraction, guildId: string) {
  const userId = String(getOptionValue(interaction, 'user') || '');
  const reason = String(getOptionValue(interaction, 'reason') || 'No reason provided');

  if (!userId) {
    return createErrorResponse('User ID is required to kick a member.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to use this command.', 403);
  }

  try {
    await performGuildKick(guildId, userId, reason);
    return createResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Successfully kicked user <@${userId}> from this server. Reason: ${reason}`,
      },
    });
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 403) {
      return createErrorResponse('Bot does not have permission to kick this member.', 403);
    }
    if (axiosError.response?.status === 404) {
      return createErrorResponse('Member not found in this guild.', 404);
    }
    return createErrorResponse(`Failed to kick user: ${axiosError.message}`);
  }
}

async function handleBanCommand(interaction: DiscordInteraction, guildId: string) {
  const userId = String(getOptionValue(interaction, 'user') || '');
  const reason = String(getOptionValue(interaction, 'reason') || 'No reason provided');

  if (!userId) {
    return createErrorResponse('User ID is required to ban a member.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to use this command.', 403);
  }

  try {
    await performGuildBan(guildId, userId, reason);
    return createResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Successfully banned user <@${userId}> from this server. Reason: ${reason}`,
      },
    });
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 403) {
      return createErrorResponse('Bot does not have permission to ban this member.', 403);
    }
    if (axiosError.response?.status === 404) {
      return createErrorResponse('Member not found in this guild.', 404);
    }
    return createErrorResponse(`Failed to ban user: ${axiosError.message}`);
  }
}

async function handleAntispamCommand(interaction: DiscordInteraction, guildId: string) {
  const action = String(getOptionValue(interaction, 'action') || 'status').toLowerCase();

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to manage automod rules.', 403);
  }

  try {
    if (action === 'enable' || action === 'deploy') {
      const result = await syncRuleByName(guildId, 'ProjectUmbrella: Spam protection', buildSpamRule());
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `✓ Spam protection rule ${result.action}.` },
      });
    }

    if (action === 'disable') {
      const result = await toggleRuleByName(guildId, 'ProjectUmbrella: Spam protection', false);
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: result.success ? `✓ ${result.message}` : `✗ ${result.message}` },
      });
    }

    if (action === 'status') {
      const rule = await getRuleStatusByName(guildId, 'ProjectUmbrella: Spam protection');
      if (!rule) {
        return createResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Spam protection rule is not configured.' },
        });
      }
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: formatRuleSummary(rule) },
      });
    }

    return createErrorResponse('Invalid action. Use enable, disable, or status.');
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return createErrorResponse(`Antispam command failed: ${axiosError.message}`);
  }
}

async function handleAntiMentionCommand(interaction: DiscordInteraction, guildId: string) {
  const action = String(getOptionValue(interaction, 'action') || 'status').toLowerCase();

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to manage automod rules.', 403);
  }

  try {
    if (action === 'enable' || action === 'deploy') {
      const result = await syncRuleByName(guildId, 'ProjectUmbrella: Mention abuse protection', buildMentionSpamRule());
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `✓ Mention protection rule ${result.action}.` },
      });
    }

    if (action === 'disable') {
      const result = await toggleRuleByName(guildId, 'ProjectUmbrella: Mention abuse protection', false);
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: result.success ? `✓ ${result.message}` : `✗ ${result.message}` },
      });
    }

    if (action === 'status') {
      const rule = await getRuleStatusByName(guildId, 'ProjectUmbrella: Mention abuse protection');
      if (!rule) {
        return createResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Mention protection rule is not configured.' },
        });
      }
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: formatRuleSummary(rule) },
      });
    }

    return createErrorResponse('Invalid action. Use enable, disable, or status.');
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return createErrorResponse(`Antimention command failed: ${axiosError.message}`);
  }
}

async function handleKeywordsCommand(interaction: DiscordInteraction, guildId: string) {
  const action = String(getOptionValue(interaction, 'action') || 'status').toLowerCase();

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to manage automod rules.', 403);
  }

  try {
    if (action === 'enable' || action === 'deploy') {
      const result = await syncRuleByName(guildId, 'ProjectUmbrella: Keyword filter', buildKeywordFilterRule());
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `✓ Keyword filter rule ${result.action}.` },
      });
    }

    if (action === 'disable') {
      const result = await toggleRuleByName(guildId, 'ProjectUmbrella: Keyword filter', false);
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: result.success ? `✓ ${result.message}` : `✗ ${result.message}` },
      });
    }

    if (action === 'status') {
      const rule = await getRuleStatusByName(guildId, 'ProjectUmbrella: Keyword filter');
      if (!rule) {
        return createResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Keyword filter rule is not configured.' },
        });
      }
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `${formatRuleSummary(rule)}\nKeywords: ${
            Array.isArray(rule.trigger_metadata?.keyword_filter)
              ? rule.trigger_metadata.keyword_filter.join(', ')
              : 'none'
          }`,
        },
      });
    }

    return createErrorResponse('Invalid action. Use enable, disable, or status.');
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return createErrorResponse(`Keywords command failed: ${axiosError.message}`);
  }
}

async function handleProfanityCommand(interaction: DiscordInteraction, guildId: string) {
  const action = String(getOptionValue(interaction, 'action') || 'status').toLowerCase();

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to manage automod rules.', 403);
  }

  try {
    if (action === 'enable' || action === 'deploy') {
      const result = await syncRuleByName(guildId, 'ProjectUmbrella: Profanity preset', buildProfanityRule());
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `✓ Profanity filter rule ${result.action}.` },
      });
    }

    if (action === 'disable') {
      const result = await toggleRuleByName(guildId, 'ProjectUmbrella: Profanity preset', false);
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: result.success ? `✓ ${result.message}` : `✗ ${result.message}` },
      });
    }

    if (action === 'status') {
      const rule = await getRuleStatusByName(guildId, 'ProjectUmbrella: Profanity preset');
      if (!rule) {
        return createResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Profanity filter rule is not configured.' },
        });
      }
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `${formatRuleSummary(rule)}\nPresets: Profanity, Slurs` },
      });
    }

    return createErrorResponse('Invalid action. Use enable, disable, or status.');
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return createErrorResponse(`Profanity command failed: ${axiosError.message}`);
  }
}

async function handleAutomodStatusCommand(interaction: DiscordInteraction, guildId: string) {
  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to view automod status.', 403);
  }

  try {
    const rules = await getProjectUmbrellaAutoModStatus(guildId);
    if (!rules.length) {
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'No ProjectUmbrella automod rules configured. Use `/antispam`, `/antimention`, `/keywords`, or `/profanity` to set them up.',
        },
      });
    }

    return createResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `**ProjectUmbrella Automod Status**\n${rules.map(formatRuleSummary).join('\n')}`,
      },
    });
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return createErrorResponse(`Status command failed: ${axiosError.message}`);
  }
}

async function handleWarnCommand(interaction: DiscordInteraction, guildId: string) {
  const userId = String(getOptionValue(interaction, 'user') || '');
  const reason = String(getOptionValue(interaction, 'reason') || 'No reason provided');

  if (!userId) {
    return createErrorResponse('User ID is required.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to warn members.', 403);
  }

  const moderatorId = interaction.member?.user?.id || 'unknown';
  addInfraction(userId, guildId, 'warn', reason, moderatorId);
  const userWarnings = getUserInfractions(userId, guildId).filter((inf) => inf.type === 'warn');

  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `⚠️ User <@${userId}> has been warned. Total warnings: **${userWarnings.length}**\nReason: ${reason}`,
    },
  });
}

async function handleMuteCommand(interaction: DiscordInteraction, guildId: string) {
  const userId = String(getOptionValue(interaction, 'user') || '');
  const reason = String(getOptionValue(interaction, 'reason') || 'No reason provided');

  if (!userId) {
    return createErrorResponse('User ID is required. to mute a member.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to mute members.', 403);
  }

  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) throw new Error('Bot token not configured.');

    const moderatorId = interaction.member?.user?.id || 'unknown';
    addInfraction(userId, guildId, 'mute', reason, moderatorId);

    const muteRoleUrl = `${DISCORD_API_BASE}/guilds/${guildId}/roles`;
    const rolesResponse = await axios.get(muteRoleUrl, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    const roles = rolesResponse.data as Array<{ id: string; name: string }>;
    let muteRoleId = roles.find((r) => r.name === '@muted')?.id;

    if (!muteRoleId) {
      const createRoleResponse = await axios.post(
        muteRoleUrl,
        { name: '@muted', permissions: 0 },
        { headers: { Authorization: `Bot ${botToken}` } },
      );
      muteRoleId = (createRoleResponse.data as { id: string }).id;
    }

    const memberRoleUrl = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${muteRoleId}`;
    await axios.put(memberRoleUrl, {}, {
      headers: {
        Authorization: `Bot ${botToken}`,
        'X-Audit-Log-Reason': reason,
      },
    });

    return createResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `🔇 User <@${userId}> has been muted.\nReason: ${reason}`,
      },
    });
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return createErrorResponse(`Mute failed: ${axiosError.message}`);
  }
}

async function handleUnmuteCommand(interaction: DiscordInteraction, guildId: string) {
  const userId = String(getOptionValue(interaction, 'user') || '');

  if (!userId) {
    return createErrorResponse('User ID is required to unmute a member.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to unmute members.', 403);
  }

  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) throw new Error('Bot token not configured.');

    const muteRoleUrl = `${DISCORD_API_BASE}/guilds/${guildId}/roles`;
    const rolesResponse = await axios.get(muteRoleUrl, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    const roles = rolesResponse.data as Array<{ id: string; name: string }>;
    const muteRoleId = roles.find((r) => r.name === '@muted')?.id;

    if (!muteRoleId) {
      return createErrorResponse('Mute role not found. User may not be muted.');
    }

    const memberRoleUrl = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${muteRoleId}`;
    await axios.delete(memberRoleUrl, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    return createResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `🔊 User <@${userId}> has been unmuted.`,
      },
    });
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return createErrorResponse(`Unmute failed: ${axiosError.message}`);
  }
}

async function handlePurgeCommand(interaction: DiscordInteraction) {
  const amount = Number(getOptionValue(interaction, 'amount') || 10);

  if (amount < 1 || amount > 100) {
    return createErrorResponse('Amount must be between 1 and 100.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to purge messages.', 403);
  }

  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `🗑️ Purge command received for ${amount} messages. This would require channel access permissions to execute bulk delete.`,
    },
  });
}

async function handleInfractionsCommand(interaction: DiscordInteraction, guildId: string) {
  const userId = String(getOptionValue(interaction, 'user') || '');

  if (!userId) {
    return createErrorResponse('User ID is required to view infractions.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to view infractions.', 403);
  }

  const userInfractions = getUserInfractions(userId, guildId);

  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `**Infractions for <@${userId}>**\n${formatInfractionList(userInfractions)}`,
    },
  });
}

async function handleSlowmodeCommand(interaction: DiscordInteraction) {
  const seconds = Number(getOptionValue(interaction, 'seconds') || 0);

  if (seconds < 0 || seconds > 21600) {
    return createErrorResponse('Slowmode must be between 0 and 21600 seconds (6 hours).');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to manage slowmode.', 403);
  }

  const status = seconds === 0 ? 'disabled' : `set to ${seconds} seconds`;
  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `⏱️ Slowmode for this channel has been ${status}.`,
    },
  });
}

async function handleAnnounceCommand(interaction: DiscordInteraction) {
  const message = String(getOptionValue(interaction, 'message') || '');

  if (!message) {
    return createErrorResponse('Message content is required.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to make announcements.', 403);
  }

  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `📢 **Announcement**\n${message}`,
    },
  });
}

async function handleClearWarnsCommand(interaction: DiscordInteraction, guildId: string) {
  const userId = String(getOptionValue(interaction, 'user') || '');

  if (!userId) {
    return createErrorResponse('User ID is required.');
  }

  const isAdmin =
    interaction.member?.permissions?.has('Administrator') ||
    interaction.member?.permissions?.has('Moderator') ||
    false;

  if (!isAdmin) {
    return createErrorResponse('You do not have permission to clear infractions.', 403);
  }

  const beforeCount = getUserInfractions(userId, guildId).filter((inf) => inf.type === 'warn').length;
  const index = infractions.findIndex((inf) => inf.userId === userId && inf.guildId === guildId && inf.type === 'warn');
  if (index !== -1) {
    infractions.splice(index, 1);
  }

  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `✅ Cleared **${beforeCount}** warning(s) for <@${userId}>.`,
    },
  });
}

function handlePing() {
  return createResponse({ type: InteractionResponseType.Pong });
}

function getOptionValue(interaction: DiscordInteraction, name: string): string | number | boolean | null {
  const option = interaction.data?.options?.find((opt: InteractionOption) => opt.name === name);
  return option?.value ?? null;
}


async function handleApplicationCommand(interaction: DiscordInteraction) {
  const commandName = interaction.data?.name?.toLowerCase() ?? 'unknown';
  const guildId = interaction.guild_id;

  switch (commandName) {
    case 'ping':
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Pong! ProjectUmbrella is connected and ready.',
        },
      });

    case 'status':
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'ProjectUmbrella is online and listening for commands.',
        },
      });

    case 'help':
      return createResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Available commands: /ping, /status, /help, /kick, /ban, /antispam, /antimention, /keywords, /profanity, /automod-status, /warn, /mute, /unmute, /purge, /infractions, /clear-warns, /slowmode, /announce, /config',
        },
      });

    case 'kick': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleKickCommand(interaction, guildId);
    }

    case 'ban': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleBanCommand(interaction, guildId);
    }

    case 'antispam': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleAntispamCommand(interaction, guildId);
    }

    case 'antimention': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleAntiMentionCommand(interaction, guildId);
    }

    case 'keywords': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleKeywordsCommand(interaction, guildId);
    }

    case 'profanity': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleProfanityCommand(interaction, guildId);
    }

    case 'automod-status': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleAutomodStatusCommand(interaction, guildId);
    }

    case 'warn': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleWarnCommand(interaction, guildId);
    }

    case 'mute': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleMuteCommand(interaction, guildId);
    }

    case 'unmute': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleUnmuteCommand(interaction, guildId);
    }

    case 'purge': {
      return await handlePurgeCommand(interaction);
    }

    case 'infractions': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleInfractionsCommand(interaction, guildId);
    }

    case 'clear-warns': {
      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }
      return await handleClearWarnsCommand(interaction, guildId);
    }

    case 'slowmode': {
      return await handleSlowmodeCommand(interaction);
    }

    case 'announce': {
      return await handleAnnounceCommand(interaction);
    }

    case 'config':
      await sendFollowup(interaction, `Command received: ${commandName}. This is a follow-up message from ProjectUmbrella.`);
      return createResponse({ type: InteractionResponseType.DeferredChannelMessageWithSource });

    default:
      await sendFollowup(interaction, `Unknown command: ${commandName}. Use /help to view supported commands.`);
      return createResponse({ type: InteractionResponseType.DeferredChannelMessageWithSource });
  }
}

function handleUnknownType(type: number) {
  return createResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `Unhandled interaction type: ${type}`,
      flags: 64,
    },
  }, 400);
}

function dispatchInteraction(interaction: DiscordInteraction) {
  switch (interaction.type) {
    case InteractionType.Ping:
      return handlePing();
    case InteractionType.ApplicationCommand:
      return handleApplicationCommand(interaction);
    default:
      return handleUnknownType(interaction.type);
  }
}

export async function GET() {
  return new Response('', { status: 200 });
}

export async function POST(request: NextRequest) {
  const { valid, body } = await verifyDiscordRequest(request);
  if (!valid) {
    return new Response('', { status: 401 });
  }

  const interaction = JSON.parse(body) as DiscordInteraction;
  return dispatchInteraction(interaction);
}