import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter is required' },
      { status: 400 }
    );
  }

  try {
    const legacyServerUrl = process.env.LEGACY_SERVER_URL;
    if (!legacyServerUrl) {
      throw new Error('Legacy server URL not configured');
    }

    const response = await fetch(`${legacyServerUrl}/blacklist-check?address=${address}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Blacklist check error:', error);
    return NextResponse.json(
      { error: 'Failed to check blacklist status' },
      { status: 500 }
    );
  }
} 