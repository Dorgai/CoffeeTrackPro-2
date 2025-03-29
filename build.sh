#!/bin/bash
set -e

# Install dependencies
npm ci

# Build the application
npm run build

# Create necessary directories
mkdir -p dist/public

# Copy static files
cp -r client/dist/* dist/public/

echo "Build completed successfully" 