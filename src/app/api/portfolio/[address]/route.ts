import { NextRequest, NextResponse } from 'next/server'
import { GoldrushAPI } from '@/lib/goldrush'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params
    const chainId = Number(request.nextUrl.searchParams.get('chainId')) || undefined

    const portfolio = await GoldrushAPI.getPortfolio(address)
    let tokens = portfolio.tokens
    if (chainId) {
      tokens = tokens.filter(token => token.chain_id === chainId)
    }
    return NextResponse.json({
      balances: tokens.map(token => ({
        symbol: token.symbol,
        balance: token.balance,
        usdValue: token.value_usd
      }))
    }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('Portfolio API error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch portfolio data' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
} 