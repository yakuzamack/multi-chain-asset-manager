# Multi-Chain Asset Manager

A Next.js application for managing crypto assets across multiple blockchains.

## Features

- **Portfolio Tracking**: View all your tokens across multiple blockchains with real-time balance updates and USD value calculations.
- **Batch Withdrawals**: Withdraw multiple tokens in a single transaction, saving on gas fees and time.
- **Cross-Chain Management**: View and manage assets across multiple blockchains with intelligent network suggestions.
- **Security Features**: Enhanced security measures including smart contract verification and protection against sending to non-contract addresses.

## Supported Networks

- Ethereum (Mainnet)
- Polygon
- Arbitrum
- Optimism 
- Binance Smart Chain (BSC)
- Avalanche
- Gnosis

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/multi-chain-asset-manager.git
cd multi-chain-asset-manager
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following content:
```
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
NEXT_PUBLIC_INFURA_API_KEY=your_infura_api_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production Deployment

See the [DEPLOYMENT.md](./DEPLOYMENT.md) file for detailed deployment instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [WalletConnect](https://walletconnect.com/)
- [Wagmi](https://wagmi.sh/)
- [Viem](https://viem.sh/) # withdrwal_app
# withdrwal_app
# multi-chain-asset-manager
