#!/bin/bash
set -e

echo "=== Multi-Chain Asset Manager Deployment Script ==="
echo

# Step 1: Check for required tools
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm 9 or higher."
    exit 1
fi

# Step 2: Environment check
if [[ ! -f .env.production ]]; then
    echo "Warning: .env.production file not found."
    echo "You can create one from the env.production.example template."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Clean installation
echo "Cleaning and installing dependencies..."
rm -rf .next node_modules
npm ci

# Step 4: Build
echo "Building application..."
npm run build

# Step 5: Prepare for deployment
echo "Preparing for deployment..."
mkdir -p deploy
cp -R .next deploy/
cp -R public deploy/
cp -R node_modules deploy/
cp package.json deploy/
cp next.config.js deploy/
cp -R server.js deploy/ 2>/dev/null || :

# Step 6: Create deployment package
echo "Creating deployment package..."
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
DEPLOY_FILE="deploy-$TIMESTAMP.zip"
cd deploy && zip -r "../$DEPLOY_FILE" . && cd ..
rm -rf deploy

echo
echo "Deployment package created: $DEPLOY_FILE"
echo
echo "To deploy manually:"
echo "1. Upload and extract $DEPLOY_FILE to your server"
echo "2. Run: NODE_ENV=production npm start"
echo
echo "For Vercel deployment, use the Vercel CLI or web interface."
echo "For Docker deployment, use the provided Dockerfile."

echo
echo "=== Deployment preparation complete ===" 