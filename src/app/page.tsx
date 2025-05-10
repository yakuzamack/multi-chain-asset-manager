'use client';

import dynamic from 'next/dynamic'
import { useState } from 'react';

// Dynamically import components that use client-side hooks
const WalletConnector = dynamic(
  () => import('../components/WalletConnector').then(mod => mod.WalletConnector),
  { ssr: false }
)

export default function Home() {
  const [showFeatures, setShowFeatures] = useState(true);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-blue-800">
          Multi-Chain Asset Manager
        </h1>
        <p className="text-lg text-gray-600 mb-8">Manage, track, and optimize your cross-chain crypto portfolio</p>
        
        {showFeatures && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
              <h2 className="text-xl font-semibold mb-3 text-blue-700">Portfolio Tracking</h2>
              <p className="text-gray-600 mb-4">View all your tokens across multiple blockchains, with real-time balance updates and USD value calculations.</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-2">
                <li>Track assets across 7 major blockchains</li>
                <li>Automatic USD value calculations</li>
                <li>Real-time balance updates</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
              <h2 className="text-xl font-semibold mb-3 text-blue-700">Batch Withdrawals</h2>
              <p className="text-gray-600 mb-4">Withdraw multiple tokens in a single transaction, saving on gas fees and time.</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-2">
                <li>Move up to 4 tokens at once on Ethereum and Polygon</li>
                <li>Secure, verified smart contract transactions</li>
                <li>Auto-detection of high-value tokens</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
              <h2 className="text-xl font-semibold mb-3 text-blue-700">Cross-Chain Management</h2>
              <p className="text-gray-600 mb-4">View and manage assets across multiple blockchains with intelligent network suggestions.</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-2">
                <li>Automatic detection of assets across chains</li>
                <li>Smart recommendations for network switching</li>
                <li>Optimized for Ethereum, Arbitrum, Polygon, Optimism, BSC, Avalanche, and Gnosis</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
              <h2 className="text-xl font-semibold mb-3 text-blue-700">Security Features</h2>
              <p className="text-gray-600 mb-4">Enhanced security measures to protect your funds during all operations.</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-2">
                <li>Smart contract verification before transactions</li>
                <li>Transaction previews with full value breakdown</li>
                <li>Protection against sending to non-contract addresses</li>
              </ul>
            </div>
          </div>
        )}
        
        <div className="bg-white p-8 rounded-xl shadow-lg border border-blue-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Get Started
            </h2>
            <button 
              onClick={() => setShowFeatures(!showFeatures)}
              className="text-sm px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showFeatures ? 'Hide Features' : 'Show Features'}
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold mr-3">1</div>
              <h3 className="font-semibold text-lg">Connect your wallet</h3>
            </div>
            <p className="text-gray-600 ml-9 mb-2">
              Click the "Connect Wallet" button to securely connect your Web3 wallet (MetaMask, WalletConnect, etc.)
            </p>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold mr-3">2</div>
              <h3 className="font-semibold text-lg">View your portfolio</h3>
            </div>
            <p className="text-gray-600 ml-9 mb-2">
              After connecting, the system will automatically scan for your assets across all supported blockchains.
              This may take a few moments as we retrieve balances and calculate USD values.
            </p>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold mr-3">3</div>
              <h3 className="font-semibold text-lg">Batch withdraw your tokens</h3>
            </div>
            <p className="text-gray-600 ml-9 mb-2">
              Switch to the "Batch Withdrawal" tab to move multiple tokens in a single transaction.
              The system will automatically recommend your highest-value tokens to withdraw.
              You'll be prompted to approve the transaction in your wallet before proceeding.
            </p>
          </div>
          
          <WalletConnector />
        </div>
      </div>
    </main>
  )
} 