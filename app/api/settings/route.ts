import { NextRequest, NextResponse } from 'next/server';
import type { DiscordConfig } from '@/lib/types';

export const defaultSettings: DiscordConfig = {
  guildId: '',
  autoModEnabled: true,
  moderationLevel: 'medium',
  safeWords: ['spam', 'scam'],
  adminRoleId: '',
};

// In-memory settings placeholder. Replace with database persistence for production.
export const savedSettings: DiscordConfig = { ...defaultSettings };

export async function GET() {
  return NextResponse.json(savedSettings);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as Partial<DiscordConfig>;
  Object.assign(savedSettings, payload);
  return NextResponse.json(savedSettings);
}
