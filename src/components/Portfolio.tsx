'use client';

import { useAccount, useChainId } from 'wagmi'
import { useEffect, useState } from 'react'

type TokenBalance = {
  symbol: string;
  balance: string;
  usdValue: string;
}

export function Portfolio() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBalances() {
      if (!address) return
      
      setLoading(true)
      setError(null)
      
      try {
        // TODO: Replace with actual Goldrush API call
        const response = await fetch(`/api/portfolio/${address}?chainId=${chainId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch portfolio')
        }
        
        setBalances(data.balances)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch portfolio')
        setBalances([])
      } finally {
        setLoading(false)
      }
    }

    fetchBalances()
  }, [address, chainId])

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg p-6">Loading portfolio...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 rounded-lg p-6">
        Error: {error}
      </div>
    )
  }

  if (balances.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        No tokens found in this wallet
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Your Portfolio</h2>
      <div className="space-y-4">
        {balances.map((token, index) => (
          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">{token.symbol}</p>
              <p className="text-sm text-gray-600">{token.balance}</p>
            </div>
            <p className="text-lg">${token.usdValue}</p>
          </div>
        ))}
      </div>
    </div>
  )
} 