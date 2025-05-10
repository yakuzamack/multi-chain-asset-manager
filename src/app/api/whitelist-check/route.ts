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
    // TODO: Replace with actual whitelist check logic from legacy server
    // For now, we'll make a call to the legacy server endpoint
    const legacyServerUrl = process.env.LEGACY_SERVER_URL;
    if (!legacyServerUrl) {
      throw new Error('Legacy server URL not configured');
    }

    const response = await fetch(`${legacyServerUrl}/whitelist-check?address=${address}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Whitelist check error:', error);
    return NextResponse.json(
      { error: 'Failed to check whitelist status' },
      { status: 500 }
    );
  }
} 