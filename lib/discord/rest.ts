import { REST } from '@discordjs/rest';

// Helper to create a Discord REST client for bot API calls.
export const createDiscordRest = (token: string) => {
  return new REST({ version: '10' }).setToken(token);
};

export const getDiscordRest = () => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN is not configured.');
  }
  return createDiscordRest(token);
};
