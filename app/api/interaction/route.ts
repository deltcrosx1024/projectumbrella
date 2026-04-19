import axios from 'axios';
import { type NextRequest } from 'next/server';
import { InteractionResponseType, InteractionType } from 'discord-api-types/v10';
import { verifyDiscordRequest } from '@/lib/discord/interaction';

// Discord interaction endpoint.
// Configure this URL as the Interaction Endpoint URL in the Discord Developer Portal.
// Discord verifies this endpoint by sending a POST with type 1 and expects a response
// body of { type: 1 }. Every request must also be verified using the
// X-Signature-Ed25519 and X-Signature-Timestamp headers.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

type DiscordInteraction = {
  type: InteractionType;
  id: string;
  application_id: string;
  token: string;
  guild_id?: string;
  data?: {
    name?: string;
    options?: any[];
    custom_id?: string;
    components?: any[];
  };
  member?: {
    user?: { id: string };
    permissions?: {
      has(permission: string): boolean;
    };
  };
  user?: { id: string };
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

function handlePing() {
  return createResponse({ type: InteractionResponseType.Pong });
}

function getOptionValue(interaction: DiscordInteraction, name: string) {
  const option = interaction.data?.options?.find((opt: any) => opt.name === name);
  return option?.value ?? null;
}

async function handleApplicationCommand(interaction: DiscordInteraction) {
  const commandName = interaction.data?.name?.toLowerCase() ?? 'unknown';

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
          content: 'Available commands: /ping, /status, /help, /kick, /deploy, /config',
        },
      });

    case 'kick': {
      const userId = getOptionValue(interaction, 'user');
      const reason = getOptionValue(interaction, 'reason') || 'No reason provided';
      const guildId = interaction.guild_id;

      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }

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
        const axiosError = error as { response?: { status?: number; data?: any }; message: string };
        if (axiosError.response?.status === 403) {
          return createErrorResponse('Bot does not have permission to kick this member.', 403);
        }
        if (axiosError.response?.status === 404) {
          return createErrorResponse('Member not found in this guild.', 404);
        }
        return createErrorResponse(`Failed to kick user: ${axiosError.message}`);
      }
    }

    case 'ban': {
      const userId = getOptionValue(interaction, 'user');
      const reason = getOptionValue(interaction, 'reason') || 'No reason provided';
      const guildId = interaction.guild_id;

      if (!guildId) {
        return createErrorResponse('Guild ID is required for this command.');
      }

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
        const axiosError = error as { response?: { status?: number; data?: any }; message: string };
        if (axiosError.response?.status === 403) {
          return createErrorResponse('Bot does not have permission to ban this member.', 403);
        }
        if (axiosError.response?.status === 404) {
          return createErrorResponse('Member not found in this guild.', 404);
        }
        return createErrorResponse(`Failed to ban user: ${axiosError.message}`);
      }
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
