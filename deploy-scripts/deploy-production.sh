#!/bin/bash

echo "🚀 Deploying Gruju Production Environment"
echo "=========================================="

# Build production frontend
echo "📦 Building production frontend..."
cd parent-activity-web
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Deploy backend to production
echo "🖥️ Deploying backend to production..."
git push production main
if [ $? -ne 0 ]; then
    echo "❌ Backend deployment failed"
    exit 1
fi

# Deploy frontend to production Firebase
echo "🌐 Deploying frontend to production Firebase..."
firebase use gruju-production
firebase deploy --only hosting:production
if [ $? -ne 0 ]; then
    echo "❌ Frontend deployment failed"
    exit 1
fi

echo "✅ Production deployment complete!"
echo "🔗 Backend: https://gruju-d3d8121d3647.herokuapp.com"
echo "🌐 Frontend: https://gruju-com.web.app (ready for gruju.com domain)"
echo "👤 Admin: admin@gruju.com / Admin123!"