#!/bin/bash

# COMPREHENSIVE TEST SUITE RUNNER
# Runs all tests for pending invitations flow and activity count functionality

echo "🚀 Starting Comprehensive Test Suite..."
echo "=========================================="

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not found. Please install Node.js."
    exit 1
fi

# Check if required test files exist
if [ ! -f "tests/comprehensive/pending-invitations-flow.test.js" ]; then
    echo "❌ Pending invitations test file not found!"
    exit 1
fi

if [ ! -f "tests/comprehensive/activity-count.test.js" ]; then
    echo "❌ Activity count test file not found!"
    exit 1
fi

if [ ! -f "tests/test-runner-comprehensive.js" ]; then
    echo "❌ Test runner not found!"
    exit 1
fi

# Set up environment
export NODE_ENV=test
export API_BASE=https://gruju-backend-5014424c95f2.herokuapp.com

echo "📋 Test Environment:"
echo "   - API Base: $API_BASE"
echo "   - Node.js version: $(node --version)"
echo "   - Test timestamp: $(date)"
echo ""

# Run comprehensive tests
echo "🧪 Running comprehensive test suite..."
echo "=========================================="

node tests/test-runner-comprehensive.js

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo "=========================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 ALL COMPREHENSIVE TESTS PASSED!"
    echo ""
    echo "✅ System Status: OPERATIONAL"
    echo "   - Pending invitations flow: ✅ Working"
    echo "   - Activity count functionality: ✅ Working" 
    echo "   - Integration scenarios: ✅ Working"
    echo ""
    echo "🚀 Ready for production use!"
    echo ""
    echo "📱 Frontend Testing URLs:"
    echo "   - Production: https://gruju-parent-activity-app.web.app"
    echo "   - Test accounts: roberts@example.com / test123"
    echo "                   jonathan.roberts006@hotmail.co.uk / test123"
else
    echo "❌ SOME TESTS FAILED!"
    echo ""
    echo "⚠️  System Status: ISSUES DETECTED"
    echo ""
    echo "🔧 Recommended Actions:"
    echo "   1. Review test output above for specific failures"
    echo "   2. Fix identified issues in code"
    echo "   3. Re-run tests: ./run-comprehensive-tests.sh"
    echo "   4. Verify fixes in frontend application"
    echo ""
    echo "📋 Common Issues:"
    echo "   - Database connection problems"
    echo "   - API endpoint changes"
    echo "   - Authentication issues"
    echo "   - Logic errors in pending invitations flow"
    echo "   - Activity count calculation problems"
fi

echo "=========================================="

exit $TEST_EXIT_CODE