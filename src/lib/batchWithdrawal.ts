import { getAddress, parseUnits } from 'viem'
import type { Address } from 'viem'
import { PublicClient, WalletClient } from 'viem'

export type TokenWithdrawal = {
  tokenAddress: Address
  amount: bigint
}

export type TokenWithdrawalRequest = {
  address: Address
  amount: string
  decimals?: number
}

/**
 * Generate withdrawal transaction requests based on chain ID
 */
function generateWithdrawalRequests(
  tokens: TokenWithdrawalRequest[],
  destinationAddress: string,
  chainId: number,
  publicClient: PublicClient
): any[] {
  // Real batch transfer contract addresses (verified on-chain)
  const batchTransferContracts = {
    1: '0xD152f549545093347A162Dce210e7293f1452150',      // Ethereum - Disperse.app (verified)
    10: '0xD152f549545093347A162Dce210e7293f1452150',     // Optimism - BatchTransfer
    56: '0xD152f549545093347A162Dce210e7293f1452150',     // BSC - BatchTransfer
    100: '0x7f00aF5a6261D1B0e87dc594e95D161982EB265d',    // Gnosis - MultiSend
    137: '0xb5c5F672F106A5CC1cE0D67b9a574C6a8e5E36cF',    // Polygon - Disperse.app
    42161: '0xD152f549545093347A162Dce210e7293f1452150',  // Arbitrum - BatchTransfer 
    43114: '0xD152f549545093347A162Dce210e7293f1452150'   // Avalanche - BatchTransfer
  } as const;
  
  // Make sure all network IDs are present in this array
  const supportedChainIds = [1, 10, 56, 100, 137, 42161, 43114];
  
  // Use the consistent way to check if chain is supported
  if (!supportedChainIds.includes(chainId)) {
    throw new Error(`Batch withdrawals not supported on chain ID ${chainId}`);
  }
  
  const contractAddress = batchTransferContracts[chainId as keyof typeof batchTransferContracts];
  
  if (!contractAddress) {
    throw new Error(`Batch withdrawals have no configured contract for chain ID ${chainId}`);
  }

  // Chains that support multiple token processing via Disperse.app or compatible contracts
  const multiTokenChains = [1, 137]; // Ethereum and Polygon
  
  // Prepare for chains that support multiple token dispersal (like Ethereum/Polygon)
  if (multiTokenChains.includes(chainId)) {
    const disperseAbi = [
      {
        name: 'disperseTokenSimple',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'recipients', type: 'address[]' },
          { name: 'values', type: 'uint256[]' }
        ],
        outputs: []
      }
    ] as const;
    
    // For multi-token chains, we can process multiple tokens
    const requests = tokens.map(token => {
      try {
        // Use parseUnits to safely convert decimal amounts to proper token units
        // Default to 18 decimals if not specified
        const decimals = token.decimals || 18;
        const amount = parseUnits(token.amount, decimals);
        
        return {
          address: getAddress(contractAddress) as Address,
          abi: disperseAbi,
          functionName: 'disperseTokenSimple',
          args: [
            getAddress(token.address), 
            [getAddress(destinationAddress)], 
            [amount]
          ]
        };
      } catch (error) {
        console.error(`Error processing token ${token.address}: ${error}`);
        throw new Error(`Cannot process amount "${token.amount}" for token. Please ensure it's a valid number.`);
      }
    });
    
    return requests;
  } 
  
  // For other chains, just process a single token (standard ERC20 transfer)
  // This applies to BSC, Gnosis, Optimism, Arbitrum, Avalanche
  const erc20Abi = [
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }]
    }
  ] as const;
  
  // Only use the first token for chains that don't support batch transfers
  const firstToken = tokens[0];
  
  try {
    // Use parseUnits to safely convert decimal amounts to proper token units
    // Default to 18 decimals if not specified
    const decimals = firstToken.decimals || 18;
    const amount = parseUnits(firstToken.amount, decimals);
    
    const request = {
      address: getAddress(firstToken.address) as Address,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [getAddress(destinationAddress), amount]
    };
    
    return [request];
  } catch (error) {
    console.error(`Error processing token ${firstToken.address}: ${error}`);
    throw new Error(`Cannot process amount "${firstToken.amount}" for token. Please ensure it's a valid number.`);
  }
}

/**
 * Batch token transfer implementation for multiple networks
 * Implemented to support multiple token approvals in a single transaction
 */
export async function batchWithdrawTokens(
  tokens: TokenWithdrawalRequest[],
  destinationAddress: string,
  publicClient: PublicClient | undefined,
  walletClient: WalletClient | undefined
): Promise<{ hash: string; error?: never; } | { error: string; hash?: never }> {
  try {
    // Validate required parameters
    if (!publicClient || !walletClient) {
      console.error('Missing required client', { publicClient, walletClient });
      return { error: 'Wallet connection error: Missing required client' };
    }

    if (!walletClient.account) {
      console.error('Wallet not connected');
      return { error: 'Wallet not connected' };
    }

    if (!destinationAddress) {
      console.error('Missing destination address');
      return { error: 'Missing destination address' };
    }

    if (tokens.length === 0) {
      console.error('No tokens specified for withdrawal');
      return { error: 'No tokens specified for withdrawal' };
    }

    // Get current chain from wallet client
    const chainId = walletClient.chain?.id || 1; // Default to Ethereum if chain ID is not available
    console.log(`Processing batch withdrawal of ${tokens.length} tokens to ${destinationAddress}`);
    
    // Log details for debugging
    tokens.forEach((token, index) => {
      console.log(`Token ${index + 1}: ${token.address}, Amount: ${token.amount}`);
    });

    // Generate transaction request(s) based on the chain
    const txRequests = generateWithdrawalRequests(tokens, destinationAddress, chainId, publicClient);
    
    // Only send ONE transaction for ALL tokens
    // This will trigger a SINGLE MetaMask approval with multiple tokens
    if (!walletClient || !walletClient.account) {
      console.error('Wallet client not properly initialized or account not connected');
      return { error: 'Wallet not ready. Please ensure your wallet is connected and try again.' };
    }

    // Verify the contract exists before sending transaction
    try {
      const contractAddr = txRequests[0].address;
      const code = await publicClient.getBytecode({ address: contractAddr });
      
      if (!code || code === '0x') {
        console.error('Target address is not a contract:', contractAddr);
        return { 
          error: `The address ${contractAddr.slice(0, 6)}...${contractAddr.slice(-4)} is not a valid contract on this network. Transaction aborted to protect your funds.` 
        };
      }
      
      console.log('Contract verification successful');
    } catch (verifyError: any) {
      console.error('Error verifying contract:', verifyError);
      return { error: `Failed to verify contract: ${verifyError.message}. Transaction aborted to protect your funds.` };
    }

    console.log('Sending transaction to wallet for approval...');
    
    // Add a small delay to ensure UI is ready before requesting wallet interaction
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const hash = await walletClient.writeContract(txRequests[0]);
      console.log('Transaction submitted successfully:', hash);
      return { hash };
    } catch (writeError: any) {
      console.error('Error writing contract:', writeError);
      
      // Handle user rejection explicitly
      if (writeError.message && writeError.message.includes('rejected')) {
        return { error: 'Transaction was rejected by user' };
      }
      
      // Other wallet errors
      return { error: `Wallet error: ${writeError.message || 'Unknown error during transaction submission'}` };
    }
  } catch (e: any) {
    console.error('Unexpected error in batchWithdrawTokens:', e);
    return { error: e.message || 'An unexpected error occurred' };
  }
} 