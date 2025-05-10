'use client';

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { GoldrushAPI } from '../goldrush'

export type TokenInfo = {
  address: string
  symbol: string
  name: string
  decimals: number
  balance?: string
  logoURI?: string
  // Additional fields for network suggestions
  chain_id?: number
  price?: number
  amount_usd?: number
  balanceLoaded?: boolean // Track if balance has been loaded
}

// Sample token lists for supported networks
// In a real implementation, these would be fetched from a token list API
const TOKEN_LISTS: Record<number, TokenInfo[]> = {
  // Ethereum Mainnet
  1: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6, chain_id: 1, price: 1.0 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chain_id: 1, price: 1.0 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chain_id: 1, price: 1.0 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chain_id: 1, price: 60000 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, chain_id: 1, price: 3000 }
  ],
  // BSC
  56: [
    { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD', decimals: 18, chain_id: 56, price: 1.0 },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18, chain_id: 56, price: 1.0 },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18, chain_id: 56, price: 1.0 },
    { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', name: 'Binance BTC', decimals: 18, chain_id: 56, price: 60000 },
    { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', name: 'Ethereum Token', decimals: 18, chain_id: 56, price: 3000 }
  ],
  // Gnosis
  100: [
    { address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83', symbol: 'USDC', name: 'USD Coin', decimals: 6, chain_id: 100, price: 1.0 },
    { address: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6', symbol: 'USDT', name: 'Tether USD', decimals: 6, chain_id: 100, price: 1.0 },
    { address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d', symbol: 'WXDAI', name: 'Wrapped XDAI', decimals: 18, chain_id: 100, price: 1.0 },
    { address: '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chain_id: 100, price: 60000 },
    { address: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, chain_id: 100, price: 3000 }
  ],
  // Polygon (Matic)
  137: [
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6, chain_id: 137, price: 1.0 },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6, chain_id: 137, price: 1.0 },
    { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chain_id: 137, price: 1.0 },
    { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chain_id: 137, price: 60000 },
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', name: 'Wrapped Matic', decimals: 18, chain_id: 137, price: 1.5 }
  ],
  // Arbitrum
  42161: [
    { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', name: 'USD Coin', decimals: 6, chain_id: 42161, price: 1.0 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6, chain_id: 42161, price: 1.0 },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chain_id: 42161, price: 1.0 },
    { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chain_id: 42161, price: 60000 },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, chain_id: 42161, price: 3000 }
  ],
  // Optimism
  10: [
    { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC', name: 'USD Coin', decimals: 6, chain_id: 10, price: 1.0 },
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', name: 'Tether USD', decimals: 6, chain_id: 10, price: 1.0 },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chain_id: 10, price: 1.0 },
    { address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chain_id: 10, price: 60000 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, chain_id: 10, price: 3000 }
  ],
  // Avalanche
  43114: [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', name: 'USD Coin', decimals: 6, chain_id: 43114, price: 1.0 },
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chain_id: 43114, price: 1.0 },
    { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chain_id: 43114, price: 1.0 },
    { address: '0x50b7545627a5162F82A992c33b87aDc75187B218', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chain_id: 43114, price: 60000 },
    { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, chain_id: 43114, price: 3000 },
    { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18, chain_id: 43114, price: 35 }
  ]
}

// Define supported networks for display and validation
export const SUPPORTED_NETWORKS = {
  1: 'Ethereum',
  10: 'Optimism',
  56: 'Binance Smart Chain',
  100: 'Gnosis Chain',
  137: 'Polygon',
  42161: 'Arbitrum One',
  43114: 'Avalanche'
}

export function useTokenList() {
  const { chainId, address } = useAccount()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balancesLoaded, setBalancesLoaded] = useState(false)
  const [crossChainTokens, setCrossChainTokens] = useState<{
    allTokens: TokenInfo[],
    highestValueTokens: TokenInfo[],
    totalValueByChain: Record<number, number>
  }>({
    allTokens: [],
    highestValueTokens: [],
    totalValueByChain: {}
  })

  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      setTokens([])
      setBalancesLoaded(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const portfolio = await GoldrushAPI.getPortfolio(address)
      const filteredTokens = chainId
        ? portfolio.tokens.filter(token => token.chain_id === chainId)
        : portfolio.tokens
      setTokens(filteredTokens.map(token => ({
        address: token.token_address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balance: token.balance,
        price: token.price_usd,
        amount_usd: token.value_usd,
        chain_id: token.chain_id,
        balanceLoaded: true
      })))
      setBalancesLoaded(true)
      // Cross-chain summary
      const valueByChain = portfolio.tokens.reduce((acc, token) => {
        if (!acc[token.chain_id]) acc[token.chain_id] = 0
        acc[token.chain_id] += token.value_usd || 0
        return acc
      }, {} as Record<number, number>)
      const topTokens = [...portfolio.tokens]
        .filter(token => token.value_usd > 0)
        .sort((a, b) => b.value_usd - a.value_usd)
        .slice(0, 10)
      setCrossChainTokens({
        allTokens: portfolio.tokens.map(token => ({
          address: token.token_address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: token.balance,
          price: token.price_usd,
          amount_usd: token.value_usd,
          chain_id: token.chain_id,
          balanceLoaded: true
        })),
        highestValueTokens: topTokens.map(token => ({
          address: token.token_address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: token.balance,
          price: token.price_usd,
          amount_usd: token.value_usd,
          chain_id: token.chain_id,
          balanceLoaded: true
        })),
        totalValueByChain: valueByChain
      })
    } catch (err) {
      setError('Failed to fetch portfolio data')
      setTokens([])
      setBalancesLoaded(false)
    } finally {
      setLoading(false)
    }
  }, [address, chainId])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  const isNetworkSupported = chainId != null && 
    Object.keys(SUPPORTED_NETWORKS).map(Number).includes(chainId)

  return {
    tokens,
    loading,
    error,
    isNetworkSupported,
    balancesLoaded,
    crossChainTokens
  }
} 