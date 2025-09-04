#!/bin/bash

# Auto-deploy to test environment (used by Claude Code)
# This script is called automatically when changes are made

echo "🤖 Claude Code: Auto-deploying to TEST environment..."

# Run the main test deployment script
./deploy-to-test.sh

if [ $? -eq 0 ]; then
    echo "✅ Auto-deployment to test successful!"
else
    echo "❌ Auto-deployment to test failed!"
    exit 1
fi