# Deployment Guide for Multi-Chain Asset Manager

This document outlines the steps to deploy the Multi-Chain Asset Manager application to a production environment.

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Access to your hosting environment (Vercel, AWS, etc.)

## Deployment Steps

### 1. Prepare for Production

Before deploying, ensure you've run a production build locally to verify everything works:

```bash
# Clean the Next.js cache (recommended before deployment)
rm -rf .next

# Install all dependencies
npm install

# Build the application
npm run build

# Optionally test the production build locally
npm run start
```

### 2. Environment Variables

Ensure the following environment variables are set in your production environment:

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Your WalletConnect project ID
- `NEXT_PUBLIC_INFURA_API_KEY` - Your Infura API key for multi-chain support
- `NEXT_PUBLIC_ALCHEMY_API_KEY` - (Optional) Alchemy API key for enhanced RPC support

You can set these in a `.env.production` file or directly in your hosting platform's environment settings.

### 3. Deployment Options

#### Option A: Vercel (Recommended)

1. Connect your repository to Vercel
2. Set the required environment variables
3. Deploy with the following settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

#### Option B: Traditional Hosting

1. Build the application locally:
   ```bash
   npm run build
   ```

2. Transfer the following files/directories to your server:
   - `.next/`
   - `node_modules/`
   - `public/`
   - `package.json`
   - `next.config.js`

3. On your server, run:
   ```bash
   npm run start
   ```

#### Option C: Docker Deployment

1. Use the following Dockerfile:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

2. Build and run the Docker container:
```bash
docker build -t multi-chain-asset-manager .
docker run -p 3000:3000 multi-chain-asset-manager
```

### 4. Post-Deployment Verification

After deploying, verify:

1. The application loads correctly
2. Wallet connection works
3. All blockchain networks can be accessed
4. Token balances are displayed correctly
5. Batch withdrawals function as expected

## Troubleshooting

- If you encounter "Module not found" errors, ensure all dependencies are properly installed
- For contract interaction issues, verify the correct contract addresses for each network
- Network connection errors may indicate an issue with RPC provider configurations

## Performance Optimization

- Enable Vercel's Edge Functions for API routes
- Configure appropriate caching headers for static assets
- Use a CDN for global distribution of the application

## Security Considerations

- Keep API keys and environment variables secure
- Regularly update dependencies to patch security vulnerabilities
- Implement rate limiting for API endpoints
- Use Content Security Policy headers to prevent XSS attacks 