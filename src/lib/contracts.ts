import { createPublicClient, http, createWalletClient, custom, type PublicClient, type WalletClient } from 'viem'
import { mainnet } from 'viem/chains'

declare global {
  interface Window {
    ethereum?: any;
  }
}

// ABI for your contract interactions
const CONTRACT_ABI = [
  // Add your contract ABI here
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export class ContractService {
  private static publicClient: PublicClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL)
  })

  static async getTokenBalance(contractAddress: string, walletAddress: string): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`]
      })

      return balance
    } catch (error) {
      console.error('Error fetching token balance:', error)
      throw error
    }
  }

  static async getWalletClient(address: string): Promise<WalletClient> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No ethereum provider found')
    }

    // This assumes the wallet is connected via WalletConnect/Web3Modal
    const walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    })

    return walletClient
  }

  static async sendTransaction(
    contractAddress: string,
    functionName: string,
    args: unknown[],
    walletAddress: string
  ) {
    try {
      const walletClient = await this.getWalletClient(walletAddress)
      
      const { request } = await this.publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName,
        args,
        account: walletAddress as `0x${string}`
      })

      const hash = await walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error sending transaction:', error)
      throw error
    }
  }
} 