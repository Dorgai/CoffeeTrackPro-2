#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building the application..."
npm run build

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p dist/public

# Copy static files
echo "Copying static files..."
cp -r client/dist/* dist/public/

# Install production dependencies
echo "Installing production dependencies..."
npm install --production

# Create production environment file
echo "Creating production environment file..."
cp .env.production .env

# Start the application with PM2
echo "Starting the application with PM2..."
pm2 delete coffeetrackpro || true
pm2 start dist/index.js --name coffeetrackpro

echo "Deployment completed successfully!" 