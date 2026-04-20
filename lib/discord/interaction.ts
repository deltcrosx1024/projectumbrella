import { verifyKey } from 'discord-interactions';
import type { NextRequest } from 'next/server';

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;

// Verify the incoming Discord webhook request using the public key.
// Returns both the parsed body and a boolean validity flag.
export async function verifyDiscordRequest(request: NextRequest): Promise<{ valid: boolean; body: string }> {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) {
    return { valid: false, body: '' };
  }

  const body = await request.text();
  const verified = await verifyKey(body, signature, timestamp, PUBLIC_KEY);
  return { valid: verified, body };
}
