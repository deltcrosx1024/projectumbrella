import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json(
    {
      success: true,
      message: 'Linked Roles verification endpoint is reachable. Use this URL in Discord application Links settings.',
    },
    { status: 200 },
  );
}
