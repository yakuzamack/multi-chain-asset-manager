'use client';

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useEffect } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia, bsc, gnosis } from 'wagmi/chains'

// Default tokens for testing - replace with actual token addresses
const TOKENS = {
  [mainnet.id]: {
    // USDC on mainnet
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  [sepolia.id]: {
    // LINK on Sepolia
    address: '0x779877A7B0D9E8603169DdbD7836e478b4624789'
  },
  [bsc.id]: {
    // BUSD on BSC
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
  },
  [gnosis.id]: {
    // USDC on Gnosis
    address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83'
  }
};

// IMPORTANT: Replace with your actual project ID from https://cloud.walletconnect.com/
// This is required to use WalletConnect - the example ID won't work in production
const projectId = '2fb18219fb9b4fb01220efa381cd8c0e'

// Safety check warning if ID is not provided
if (!projectId) {
  console.warn('⚠️ WalletConnect Project ID is not set. Please create one at https://cloud.walletconnect.com');
}

const chains = [mainnet, bsc, gnosis, sepolia] as const
const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(`https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`),
    [sepolia.id]: http('https://sepolia.publicnode.com'),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [gnosis.id]: http('https://rpc.gnosischain.com')
  }
})

// Creating web3modal with development-friendly config
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  defaultChain: mainnet,
  themeMode: 'light',
  metadata: {
    name: 'Web3 Token Transfer',
    description: 'Batch token transfer application',
    url: 'http://localhost:3000', // Development URL
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  // Disable extra features to reduce API calls
  featuredWalletIds: [],
  includeWalletIds: [],
  enableAnalytics: false,
  enableOnramp: false
})

// Create query client
const queryClient = new QueryClient()

export function Web3Modal({ children }: { children: ReactNode }) {
  // Suppress dev-mode warnings in console
  useEffect(() => {
    const originalConsoleWarn = console.warn;
    console.warn = function() {
      // Filter out Lit warnings
      if (arguments[0]?.includes?.('Lit is in dev mode') || 
          arguments[0]?.includes?.('Multiple versions of Lit')) {
        return;
      }
      // @ts-ignore
      originalConsoleWarn.apply(console, arguments);
    };
    
    return () => {
      console.warn = originalConsoleWarn;
    };
  }, []);
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 