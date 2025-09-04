#!/bin/bash

echo "🧪 Deploying Gruju Test Environment"
echo "===================================="

# Build frontend
echo "📦 Building frontend..."
cd parent-activity-web
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Deploy backend to test
echo "🖥️ Deploying backend to test..."
git push test-heroku main
if [ $? -ne 0 ]; then
    echo "❌ Backend deployment failed"
    exit 1
fi

# Deploy frontend to test Firebase
echo "🌐 Deploying frontend to test Firebase..."
cp firebase.json.test firebase.json
firebase use gruju-parent-activity-app
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "❌ Frontend deployment failed"
    exit 1
fi

echo "✅ Test deployment complete!"
echo "🔗 Backend: https://gruju-backend-5014424c95f2.herokuapp.com"
echo "🌐 Frontend: https://gruju-parent-activity-app.web.app"
echo "👤 Test users: roberts10@example.com, roberts11@example.com, charlie@example.com"