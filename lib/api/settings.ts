import { api } from './axios';
import type { DiscordConfig } from '@/lib/types';

// Fetch saved Discord config from the API route.
export async function fetchDiscordSettings() {
  const response = await api.get<DiscordConfig>('/settings');
  return response.data;
}

// Save updated Discord config through the API route.
export async function saveDiscordSettings(config: DiscordConfig) {
  const response = await api.post<DiscordConfig>('/settings', config);
  return response.data;
}
