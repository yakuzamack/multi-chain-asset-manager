/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['viem'],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              connect-src 'self' https://*.infura.io https://ethereum.publicnode.com https://api.web3modal.com wss://*.walletconnect.org https://*.walletconnect.com https://*.coinbase.com https://*.etherscan.io https://*.polygonscan.com https://*.arbiscan.io https://*.optimistic.etherscan.io https://*.bscscan.com https://*.snowtrace.io https://*.gnosisscan.io;
              img-src 'self' data:;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              font-src 'self' https://fonts.gstatic.com;
            `.replace(/\n/g, ''), // Remove newlines for CSP
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 