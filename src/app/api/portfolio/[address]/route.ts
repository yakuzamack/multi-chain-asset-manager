import { NextRequest, NextResponse } from 'next/server'

// TODO: Replace with actual Goldrush API implementation
async function getPortfolioFromGoldrush(address: string, chainId: number) {
  // This is a mock implementation
  // Replace with actual Goldrush API calls
  return {
    balances: [
      {
        symbol: 'ETH',
        balance: '1.5',
        usdValue: '3000'
      },
      {
        symbol: 'USDC',
        balance: '1000',
        usdValue: '1000'
      }
    ]
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params
    const chainId = Number(request.nextUrl.searchParams.get('chainId')) || 1

    const data = await getPortfolioFromGoldrush(address, chainId)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Portfolio API error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch portfolio data' },
      { status: 500 }
    )
  }
} 