import { mainnet, sepolia } from 'wagmi/chains';

const GOLDRUSH_API_KEY = process.env.GOLDRUSH_API_KEY;
const GOLDRUSH_API_URL = 'https://api.goldrush.com/v1'; // Replace with actual Goldrush API URL

// Default tokens for testing - replace with actual token addresses
const DEFAULT_TOKENS = {
  [mainnet.id]: {
    // USDC on mainnet
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  [sepolia.id]: {
    // Test token on Sepolia
    address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    symbol: 'LINK',
    name: 'Chainlink Token',
    decimals: 18
  }
};

export type TokenBalance = {
  token_address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  price_usd: number;
  value_usd: number;
  chain_id: number;
};

export type PortfolioData = {
  total_value_usd: number;
  tokens: TokenBalance[];
};

export class GoldrushAPI {
  private static headers = {
    'Authorization': `Bearer ${GOLDRUSH_API_KEY}`,
    'Content-Type': 'application/json',
  };

  static async getPortfolio(address: string): Promise<PortfolioData> {
    try {
      // If Goldrush API is not configured, return test data
      if (!GOLDRUSH_API_KEY) {
        return this.getTestPortfolioData(address);
      }

      const response = await fetch(`${GOLDRUSH_API_URL}/portfolio/${address}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Goldrush API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformPortfolioData(data);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      // Fallback to test data if API fails
      return this.getTestPortfolioData(address);
    }
  }

  static async getTokenPrice(tokenAddress: string, chainId: number): Promise<number> {
    try {
      // If Goldrush API is not configured, return test price
      if (!GOLDRUSH_API_KEY) {
        return chainId === mainnet.id ? 1.0 : 0.5; // Test prices
      }

      const response = await fetch(
        `${GOLDRUSH_API_URL}/tokens/${chainId}/${tokenAddress}/price`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Goldrush API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.price_usd;
    } catch (error) {
      console.error('Error fetching token price:', error);
      // Return test price if API fails
      return chainId === mainnet.id ? 1.0 : 0.5;
    }
  }

  private static transformPortfolioData(data: any): PortfolioData {
    return {
      total_value_usd: data.total_value_usd || 0,
      tokens: (data.tokens || []).map((token: any) => ({
        token_address: token.address,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        price_usd: token.price_usd,
        value_usd: token.value_usd,
        chain_id: token.chain_id,
      })),
    };
  }

  private static getTestPortfolioData(address: string): PortfolioData {
    const tokens: TokenBalance[] = [
      {
        ...DEFAULT_TOKENS[mainnet.id],
        balance: '1000000', // 1 USDC (6 decimals)
        price_usd: 1.0,
        value_usd: 1.0,
        chain_id: mainnet.id,
        token_address: DEFAULT_TOKENS[mainnet.id].address
      },
      {
        ...DEFAULT_TOKENS[sepolia.id],
        balance: '1000000000000000000', // 1 LINK (18 decimals)
        price_usd: 15.0,
        value_usd: 15.0,
        chain_id: sepolia.id,
        token_address: DEFAULT_TOKENS[sepolia.id].address
      }
    ];

    return {
      total_value_usd: tokens.reduce((sum, token) => sum + token.value_usd, 0),
      tokens
    };
  }
} 