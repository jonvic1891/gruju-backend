#!/bin/bash

echo "🧪 Deploying to TEST Environment"
echo "================================="
echo "Backend: gruju-backend-5014424c95f2.herokuapp.com"
echo "Frontend: gruju-parent-activity-app.web.app"
echo ""

# Check if we're in the right directory
if [ ! -d "parent-activity-web" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Set test environment variables
export NODE_ENV=development

# Build frontend for test environment 
echo "📦 Building frontend for test environment..."
cd parent-activity-web
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Deploy backend to test Heroku
echo "🖥️ Deploying backend to test Heroku..."
git add -A
git commit -m "Deploy to test environment - $(date '+%Y-%m-%d %H:%M:%S')" || echo "ℹ️  No changes to commit"
git push test-heroku main
if [ $? -ne 0 ]; then
    echo "❌ Backend deployment to test failed"
    exit 1
fi

# Deploy frontend to test Firebase
echo "🌐 Deploying frontend to test Firebase..."
# Temporarily use test firebase config
cp firebase.json firebase.json.backup 2>/dev/null || true
cp firebase.json.test firebase.json
firebase use gruju-parent-activity-app
firebase deploy --only hosting
deploy_status=$?

# Restore firebase config
mv firebase.json.backup firebase.json 2>/dev/null || true

if [ $deploy_status -ne 0 ]; then
    echo "❌ Frontend deployment to test failed"
    exit 1
fi

echo ""
echo "✅ TEST Environment Deployment Complete!"
echo "🔗 Backend: https://gruju-backend-5014424c95f2.herokuapp.com"
echo "🌐 Frontend: https://gruju-parent-activity-app.web.app"
echo "👤 Test with: roberts10@example.com, roberts11@example.com, charlie@example.com"
echo ""