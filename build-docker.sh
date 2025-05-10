#!/bin/bash
set -e

echo "=== Building and Running Multi-Chain Asset Manager Docker Container ==="

# Build the Docker image
docker build -t multi-chain-asset-manager .

# Run the container
docker run -d -p 3000:3000 --name multi-chain-asset-manager multi-chain-asset-manager

echo "=== Container started on http://localhost:3000 ==="
echo "To stop the container: docker stop multi-chain-asset-manager"
echo "To view logs: docker logs multi-chain-asset-manager" 