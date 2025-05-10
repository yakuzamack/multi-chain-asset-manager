'use client';

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'

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
  // Add a state for cross-chain token data
  const [crossChainTokens, setCrossChainTokens] = useState<{
    allTokens: TokenInfo[],
    highestValueTokens: TokenInfo[],
    totalValueByChain: Record<number, number>
  }>({
    allTokens: [],
    highestValueTokens: [],
    totalValueByChain: {}
  })

  const fetchTokenBalances = useCallback(async () => {
    if (!chainId || !address) {
      setTokens([])
      setBalancesLoaded(false)
      return
    }

    try {
      // Get token list for the current chain
      const tokenList = TOKEN_LISTS[chainId as keyof typeof TOKEN_LISTS] || []
      
      // In a real implementation, fetch balances one at a time to be more reliable
      // For demo purposes, simulate randomized balances
      const tokensWithBalances = await Promise.all(
        tokenList.map(async token => {
          // Add a small randomized delay for each token to simulate network request
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500))
          
          // Ensure at least one token has a balance for demo purposes
          const hasBalance = token.symbol === 'USDC' || Math.random() > 0.5
          const randomBalance = hasBalance ? (Math.random() * 100).toFixed(4) : '0'
          const amount = hasBalance ? Math.random() * 1000 : 0
          
          return {
            ...token,
            balance: randomBalance,
            amount_usd: amount,
            balanceLoaded: true
          }
        })
      )
      
      console.log('All token balances loaded successfully')
      setTokens(tokensWithBalances)
      setBalancesLoaded(true)
    } catch (err) {
      console.error('Error fetching token balances:', err)
      // Don't set error state - just keep tokens as they are
    }
  }, [chainId, address])

  // Add a function to identify highest value tokens across all chains
  const calculateCrossChainOpportunities = useCallback(() => {
    // Start with an empty array for all tokens across chains
    let allCrossChainTokens: TokenInfo[] = [];
    
    // Include all supported chains token lists
    Object.keys(TOKEN_LISTS).forEach(chainIdStr => {
      const chainId = Number(chainIdStr);
      
      // Skip unsupported chains
      if (!Object.keys(SUPPORTED_NETWORKS).includes(chainIdStr)) {
        return;
      }
      
      // Get tokens for this chain and add them to our array
      const chainTokens = TOKEN_LISTS[chainId as keyof typeof TOKEN_LISTS] || [];
      
      // Only add tokens with balance
      chainTokens.forEach(token => {
        // For demo we'll randomize balances, in a real app this would be real balances
        const hasBalance = Math.random() > 0.3; // 70% chance of having a balance
        const randomBalance = hasBalance ? (Math.random() * 100).toFixed(4) : '0';
        const usdValue = hasBalance ? parseFloat(randomBalance) * (token.price || 0) : 0;
        
        allCrossChainTokens.push({
          ...token,
          balance: randomBalance,
          amount_usd: usdValue,
          balanceLoaded: true
        });
      });
    });
    
    // Calculate total value by chain
    const valueByChain = allCrossChainTokens.reduce((acc: Record<number, number>, token) => {
      const chainId = token.chain_id || 1;
      if (!acc[chainId]) acc[chainId] = 0;
      
      const tokenValue = token.amount_usd || (parseFloat(token.balance || '0') * (token.price || 0));
      acc[chainId] += tokenValue;
      return acc;
    }, {});
    
    // Get top 10 tokens by value across all chains
    const topTokens = [...allCrossChainTokens]
      .filter(token => {
        const tokenValue = token.amount_usd || (parseFloat(token.balance || '0') * (token.price || 0));
        return tokenValue > 0;
      })
      .sort((a, b) => {
        const aValue = a.amount_usd || (parseFloat(a.balance || '0') * (a.price || 0));
        const bValue = b.amount_usd || (parseFloat(b.balance || '0') * (b.price || 0));
        return bValue - aValue; // Highest value first
      })
      .slice(0, 10);
    
    setCrossChainTokens({
      allTokens: allCrossChainTokens,
      highestValueTokens: topTokens,
      totalValueByChain: valueByChain
    });
    
  }, []);

  useEffect(() => {
    async function loadTokens() {
      if (!chainId || !address) {
        setTokens([])
        setBalancesLoaded(false)
        return
      }

      setLoading(true)
      setError(null)
      setBalancesLoaded(false)

      // Validate if chain is supported - add explicit check for Arbitrum
      const isChainSupported = Object.keys(SUPPORTED_NETWORKS)
        .map(Number)
        .includes(chainId);
      
      if (!isChainSupported) {
        console.error(`Chain ID ${chainId} is not supported. Supported chains: ${Object.keys(SUPPORTED_NETWORKS).join(', ')}`);
        setError(`Network not supported. Please switch to one of our supported networks.`);
        setLoading(false);
        return;
      }

      try {
        // First load token list without balances to show something quickly
        const tokenList = TOKEN_LISTS[chainId as keyof typeof TOKEN_LISTS] || []
        
        // Initialize tokens with empty balances first
        const initialTokens = tokenList.map(token => ({
          ...token,
          balance: '0',
          balanceLoaded: false
        }))
        
        setTokens(initialTokens)
        
        // Then fetch balances in the background
        await fetchTokenBalances()
        
        // After loading tokens, also calculate cross-chain opportunities
        calculateCrossChainOpportunities();
      } catch (err) {
        console.error('Error loading token list:', err)
        setError('Failed to load token list')
      } finally {
        setLoading(false)
      }
    }

    loadTokens()
  }, [chainId, address, fetchTokenBalances, calculateCrossChainOpportunities])

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