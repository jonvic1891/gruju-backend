#!/bin/bash

echo "🚀 Starting Parent Activity App Multi-Environment System..."
echo ""

# Check if backend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Build the backend
echo "🔧 Building backend..."
npm run build

# Kill any existing servers
echo "🛑 Stopping existing servers..."
pkill -f "node dist/server.js" 2>/dev/null || true
pkill -f "serve-admin.js" 2>/dev/null || true

# Start the backend server
echo "🚀 Starting backend server (port 3000)..."
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start the admin panel server
echo "🎛️ Starting admin panel server (port 8080)..."
node serve-admin.js &
ADMIN_PID=$!

# Wait a moment for servers to start
sleep 2

echo ""
echo "✅ All servers started successfully!"
echo ""
echo "🌐 Available URLs:"
echo "   📊 Backend API: http://localhost:3000"
echo "   🎛️ Multi-Environment Admin: http://localhost:8080/admin"
echo "   🗄️ Database Admin: http://localhost:8080/database-admin"
echo "   🎮 Demo App: http://localhost:8080/demo"
echo ""
echo "🔑 Demo Credentials:"
echo "   👑 Super Admin: admin@parentactivityapp.com / demo123"
echo "   ⚙️ Admin: manager@parentactivityapp.com / demo123"
echo ""
echo "📖 Documentation:"
echo "   📋 Setup Guide: MULTI_ENVIRONMENT_GUIDE.md"
echo "   🗄️ Database Guide: DATABASE_SETUP_GUIDE.md"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $ADMIN_PID 2>/dev/null || true
    pkill -f "node dist/server.js" 2>/dev/null || true
    pkill -f "serve-admin.js" 2>/dev/null || true
    echo "✅ All servers stopped"
    exit 0
}

# Set up trap to call cleanup function on script exit
trap cleanup INT TERM

# Keep the script running
while true; do
    sleep 1
done