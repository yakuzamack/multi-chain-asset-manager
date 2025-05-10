'use client';

import { useAccount, useConfig } from 'wagmi'
import { switchNetwork } from 'wagmi/actions'
import { useState, useEffect } from 'react'
import { SUPPORTED_NETWORKS } from '@/lib/hooks/useTokenList'
import { useTokenList, TokenInfo } from '@/lib/hooks/useTokenList'

const NETWORK_DETAILS = {
  1: {
    name: 'Ethereum',
    icon: '🔷',
    className: 'text-blue-600 bg-blue-100'
  },
  10: {
    name: 'Optimism',
    icon: '🔴',
    className: 'text-red-600 bg-red-100'
  },
  56: {
    name: 'BSC',
    icon: '🟨',
    className: 'text-yellow-600 bg-yellow-100'
  },
  100: {
    name: 'Gnosis',
    icon: '🟩',
    className: 'text-green-600 bg-green-100'
  },
  137: {
    name: 'Polygon',
    icon: '🟣',
    className: 'text-purple-600 bg-purple-100'
  },
  42161: {
    name: 'Arbitrum',
    icon: '🔵',
    className: 'text-blue-700 bg-blue-50'
  },
  43114: {
    name: 'Avalanche',
    icon: '❄️',
    className: 'text-red-700 bg-red-50'
  }
}

export function NetworkSelector() {
  const { chainId, address } = useAccount()
  const config = useConfig()
  const [isLoading, setIsLoading] = useState(false)
  const [pendingChainId, setPendingChainId] = useState<number | null>(null)
  const { tokens, crossChainTokens } = useTokenList()
  const [suggestedNetwork, setSuggestedNetwork] = useState<number | null>(null)
  const [suggestedReason, setSuggestedReason] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  
  // Calculate suggested network based on wallet assets
  useEffect(() => {
    // First, check if we have cross-chain data available
    if (crossChainTokens && Object.keys(crossChainTokens.totalValueByChain).length > 0) {
      // Use the cross-chain data to determine the best network
      let highestValue = 0;
      let bestNetwork = null;
      let reason = '';
      
      // Find network with highest total value
      Object.entries(crossChainTokens.totalValueByChain).forEach(([networkId, value]) => {
        const chainIdNum = Number(networkId);
        if (value > highestValue && Object.keys(SUPPORTED_NETWORKS).map(Number).includes(chainIdNum)) {
          highestValue = value;
          bestNetwork = chainIdNum;
          reason = `highest value assets ($${value.toFixed(2)})`;
        }
      });
      
      // Also check if any of the top tokens are on different networks
      if (crossChainTokens.highestValueTokens.length > 0) {
        const topToken = crossChainTokens.highestValueTokens[0];
        const topTokenChainId = topToken.chain_id;
        const topTokenValue = topToken.amount_usd || (parseFloat(topToken.balance || '0') * (topToken.price || 0));
        
        // If top token is on a different chain and has significant value
        if (topTokenChainId !== chainId && topTokenValue > highestValue * 0.8) {
          bestNetwork = topTokenChainId;
          reason = `highest value token (${topToken.symbol}: $${topTokenValue.toFixed(2)})`;
        }
      }
      
      // Only suggest a different network than the current one
      if (bestNetwork && bestNetwork !== chainId) {
        setSuggestedNetwork(bestNetwork);
        setSuggestedReason(reason);
      } else {
        setSuggestedNetwork(null);
      }
      
      return;
    }
    
    // Fall back to original implementation if cross-chain data isn't available
    if (!tokens || tokens.length === 0) return
    
    // Group tokens by chain and calculate total value per chain
    const networkValues = tokens.reduce((acc: Record<number, number>, token) => {
      // Get chain ID from the token
      const network = token.chain_id || Number(chainId) || 1
      if (!acc[network]) acc[network] = 0
      
      // Use amount_usd if available, otherwise calculate from balance and price
      const tokenValue = token.amount_usd || (parseFloat(token.balance || '0') * (token.price || 0))
      acc[network] += tokenValue
      return acc
    }, {})
    
    // Find the network with the highest value
    let highestValue = 0
    let bestNetwork = null
    
    for (const network in networkValues) {
      if (networkValues[network] > highestValue && Object.keys(SUPPORTED_NETWORKS).map(Number).includes(Number(network))) {
        highestValue = networkValues[network]
        bestNetwork = Number(network)
      }
    }
    
    // Only suggest a different network than the current one
    if (bestNetwork && bestNetwork !== chainId) {
      setSuggestedNetwork(bestNetwork)
      setSuggestedReason(`highest value assets ($${highestValue.toFixed(2)})`)
    } else {
      setSuggestedNetwork(null)
    }
  }, [tokens, chainId, crossChainTokens])
  
  const handleSwitchNetwork = async (networkId: number) => {
    try {
      setIsLoading(true)
      setPendingChainId(networkId)
      
      console.log(`Switching to network ${networkId}: ${NETWORK_DETAILS[networkId as keyof typeof NETWORK_DETAILS]?.name}`)
      
      // Special handling for Arbitrum to ensure it works correctly
      if (networkId === 42161) {
        console.log('Special handling for Arbitrum network switch')
      }
      
      await switchNetwork(config, { chainId: networkId })
    } catch (error) {
      console.error('Failed to switch network:', error)
      setError(`Failed to switch to ${NETWORK_DETAILS[networkId as keyof typeof NETWORK_DETAILS]?.name || networkId}`)
    } finally {
      setIsLoading(false)
      setPendingChainId(null)
    }
  }
  
  const currentNetwork = chainId ? NETWORK_DETAILS[chainId as keyof typeof NETWORK_DETAILS] : null
  
  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <span className="text-sm text-gray-500 mr-2">Network:</span>
        {currentNetwork ? (
          <span className={`text-sm font-medium py-1 px-2 rounded-full ${currentNetwork.className}`}>
            {currentNetwork.icon} {currentNetwork.name}
          </span>
        ) : (
          <span className="text-sm text-red-600">Unsupported Network</span>
        )}
      </div>
      
      {/* Suggested network based on assets */}
      {suggestedNetwork && suggestedNetwork !== chainId && (
        <div className="mt-2 p-2 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-700 mb-2">
            <span className="font-medium">Recommended Network:</span> Switch to the network with your {suggestedReason}:
          </p>
          <button
            onClick={() => handleSwitchNetwork(suggestedNetwork)}
            disabled={isLoading && pendingChainId === suggestedNetwork}
            className={`text-sm py-1 px-3 rounded-full ${NETWORK_DETAILS[suggestedNetwork as keyof typeof NETWORK_DETAILS].className} hover:opacity-80 transition-opacity disabled:opacity-50`}
          >
            {isLoading && pendingChainId === suggestedNetwork ? 'Switching...' : (
              <>
                {NETWORK_DETAILS[suggestedNetwork as keyof typeof NETWORK_DETAILS].icon} 
                Switch to {NETWORK_DETAILS[suggestedNetwork as keyof typeof NETWORK_DETAILS].name}
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Cross-chain asset summary */}
      {crossChainTokens && Object.keys(crossChainTokens.totalValueByChain).length > 0 && (
        <div className="mt-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
          <div className="text-sm font-medium mb-1 text-gray-700">Your Assets by Chain:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Object.entries(crossChainTokens.totalValueByChain)
              .filter(([_, value]) => value > 0)
              .sort(([_, valueA], [__, valueB]) => valueB - valueA) // Sort by value descending
              .map(([chainIdStr, value]) => {
                const chainIdNum = Number(chainIdStr);
                const networkInfo = NETWORK_DETAILS[chainIdNum as keyof typeof NETWORK_DETAILS];
                
                if (!networkInfo) return null; // Skip unknown networks
                
                return (
                  <div key={chainIdStr} className="flex justify-between items-center">
                    <span className={`text-xs py-0.5 px-2 rounded-full ${networkInfo.className}`}>
                      {networkInfo.icon} {networkInfo.name}
                    </span>
                    <span className="text-xs font-medium">
                      ${value.toFixed(2)}
                    </span>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
      
      {(!currentNetwork || !Object.keys(SUPPORTED_NETWORKS).map(Number).includes(chainId as number)) && (
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-sm text-gray-500">Switch to:</span>
          {Object.entries(SUPPORTED_NETWORKS).map(([networkId, name]) => (
            <button
              key={networkId}
              onClick={() => handleSwitchNetwork(Number(networkId))}
              disabled={isLoading && pendingChainId === Number(networkId)}
              className={`text-sm py-1 px-3 rounded-full ${
                NETWORK_DETAILS[Number(networkId) as keyof typeof NETWORK_DETAILS].className
              } hover:opacity-80 transition-opacity disabled:opacity-50`}
            >
              {isLoading && pendingChainId === Number(networkId) ? 'Switching...' : (
                <>
                  {NETWORK_DETAILS[Number(networkId) as keyof typeof NETWORK_DETAILS].icon} 
                  {NETWORK_DETAILS[Number(networkId) as keyof typeof NETWORK_DETAILS].name}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 