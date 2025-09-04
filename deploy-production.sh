#!/bin/bash

echo "🚀 Deploying to PRODUCTION Environment"
echo "======================================"
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
echo "Backend: gruju-d3d8121d3647.herokuapp.com"
echo "Frontend: gruju.com (gruju-com.web.app)"
echo ""

# Confirmation prompt
read -p "Are you sure you want to deploy to PRODUCTION? (type 'DEPLOY' to confirm): " confirmation
if [ "$confirmation" != "DEPLOY" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Check if we're in the right directory
if [ ! -d "parent-activity-web" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Set production environment variables
export NODE_ENV=production

# Build frontend for production environment
echo "📦 Building frontend for production environment..."
cd parent-activity-web
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Deploy backend to production Heroku
echo "🖥️ Deploying backend to production Heroku..."
git add -A
git commit -m "Deploy to production environment - $(date '+%Y-%m-%d %H:%M:%S')" || echo "ℹ️  No changes to commit"
git push production main
if [ $? -ne 0 ]; then
    echo "❌ Backend deployment to production failed"
    exit 1
fi

# Deploy frontend to production Firebase
echo "🌐 Deploying frontend to production Firebase..."
firebase use gruju-production
firebase deploy --only hosting:production
if [ $? -ne 0 ]; then
    echo "❌ Frontend deployment to production failed"
    exit 1
fi

echo ""
echo "🎉 PRODUCTION Environment Deployment Complete!"
echo "🔗 Backend: https://gruju-d3d8121d3647.herokuapp.com"
echo "🌐 Frontend: https://gruju-com.web.app (gruju.com when DNS is ready)"
echo "👤 Admin: admin@gruju.com / Admin123!"
echo ""
echo "🔍 Verify deployment:"
echo "  - Test login with admin credentials"
echo "  - Check backend health: curl -I https://gruju-d3d8121d3647.herokuapp.com/api/auth/verify"
echo ""