import { type NextRequest, NextResponse } from 'next/server';
import { verifyDiscordRequest } from '@/lib/discord/interaction';

// Discord interactions are handled here using the verified webhook request.
export async function POST(request: NextRequest) {
  const body = await verifyDiscordRequest(request);
  if (!body) {
    return new NextResponse('Invalid request signature', { status: 401 });
  }

  const interaction = JSON.parse(body);

  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  if (interaction.type === 2) {
    const commandName = interaction.data?.name ?? 'unknown';
    return NextResponse.json({
      type: 4,
      data: {
        content: `ProjectUmbrella received command: ${commandName}`,
      },
    });
  }

  return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
}
