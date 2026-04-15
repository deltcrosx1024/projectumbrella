import { NextRequest, NextResponse } from 'next/server';
import type { DiscordConfig } from '@/lib/types';

const defaultSettings: DiscordConfig = {
  guildId: '',
  autoModEnabled: true,
  moderationLevel: 'medium',
  safeWords: ['spam', 'scam'],
  adminRoleId: '',
};

// In-memory settings placeholder. Replace with database persistence for production.
let savedSettings: DiscordConfig = { ...defaultSettings };

export async function GET() {
  return NextResponse.json(savedSettings);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as Partial<DiscordConfig>;
  savedSettings = { ...savedSettings, ...payload };
  return NextResponse.json(savedSettings);
}
