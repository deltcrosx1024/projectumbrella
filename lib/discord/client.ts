import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import { createDiscordRest } from './rest';

// Basic bot client wrapper for command registration and REST access.
export class BotClient extends Client {
  public commands: Collection<string, unknown>;
  public rest: ReturnType<typeof createDiscordRest>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // Add other intents as needed for automod features
      ],
    });
    this.commands = new Collection();
    this.rest = createDiscordRest(process.env.DISCORD_BOT_TOKEN!);
  }

  // Register slash commands globally or for a specific guild.
  async registerCommands(commands: unknown[], guildId?: string) {
    if (guildId) {
      this.rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId), {
        body: commands,
      });
    } else {
      this.rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
        body: commands,
      });
    }
  }
}

// Export a singleton client instance for reuse across the application.
export const botClient = new BotClient();
