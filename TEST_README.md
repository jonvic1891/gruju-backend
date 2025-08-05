# 🧪 Connection Request Feature Test Suite

Comprehensive test coverage for the enhanced connection request functionality with detailed child information.

## 📋 Test Coverage

### Backend API Tests (`tests/integration/connections/`)
- ✅ **GET /api/connections/requests** - Fetch incoming requests with detailed child info
- ✅ **GET /api/connections/sent-requests** - Fetch sent requests for tracking
- ✅ **POST /api/connections/request** - Create connection requests with child details
- ✅ **GET /api/connections/search** - Search parents with children information
- ✅ **POST /api/connections/respond/:id** - Accept/reject requests
- ✅ **Authentication & Authorization** - JWT token validation
- ✅ **Error Handling** - Network errors, validation errors, HTTP errors

### Frontend Component Tests (`parent-activity-web/src/components/__tests__/`)
- ✅ **ConnectionsScreen Component** - Complete UI functionality
- ✅ **Incoming Requests Display** - Child information rendering
- ✅ **Sent Requests Tracking** - Real-time updates
- ✅ **Search Functionality** - Parent search with validation  
- ✅ **Connection Request Modal** - Child selection and messaging
- ✅ **Accept/Reject Actions** - Request response handling
- ✅ **Error States** - API error handling and user feedback

### Frontend Service Tests (`parent-activity-web/src/services/__tests__/`)
- ✅ **API Service Methods** - All connection request endpoints
- ✅ **Authentication Headers** - Token management
- ✅ **Request/Response Handling** - Data transformation
- ✅ **Error Handling** - Network and HTTP errors

### Unit Tests (`tests/unit/`)
- ✅ **Data Validation** - Connection request structure validation
- ✅ **Child Information Extraction** - Detailed child data parsing
- ✅ **Mock Data Generation** - Test data creation utilities
- ✅ **Edge Cases** - Null values, empty strings, malformed data

## 🚀 Running Tests

### Run All Tests (Recommended)
```bash
npm run test:all
```
This runs both backend and frontend tests with detailed reporting.

### Run Specific Test Suites

#### Backend Only
```bash
# All backend tests
npm test

# Connection request integration tests only
npm run test:connections

# Unit tests only
npm run test:unit

# With coverage
npm run test:coverage
```

#### Frontend Only
```bash
cd parent-activity-web

# All frontend tests
npm test

# ConnectionsScreen component tests only
npm test -- --testPathPattern=ConnectionsScreen

# API service tests only
npm test -- --testPathPattern=api.test

# With coverage
npm test -- --coverage
```

### Regression Testing
```bash
npm run test:regression
```
Runs the critical connection request tests to ensure no regressions.

## 🏗️ Test Structure

```
├── tests/
│   ├── setup.js                                    # Jest configuration
│   ├── helpers/
│   │   └── testHelpers.js                         # Test utilities & mock data
│   ├── integration/
│   │   └── connections/
│   │       └── connectionRequests.test.js        # API integration tests
│   └── unit/
│       └── connectionValidation.test.js          # Unit tests
├── parent-activity-web/src/
│   ├── components/__tests__/
│   │   └── ConnectionsScreen.test.tsx            # Component tests
│   └── services/__tests__/
│       └── api.test.ts                           # Service tests
└── test-runner.js                                # Comprehensive test runner
```

## 🎯 Key Test Scenarios

### User Stories Tested:
1. **As a parent, I want to see detailed information about children in connection requests**
   - ✅ Child names, ages, grades, schools displayed
   - ✅ Both requester and target child information shown

2. **As a parent, I want to track my sent connection requests**
   - ✅ Sent requests section displays pending requests
   - ✅ Real-time updates when sending new requests

3. **As a parent, I want to easily accept or reject connection requests**
   - ✅ Accept/reject buttons work correctly
   - ✅ Confirmation dialogs prevent accidental actions
   - ✅ Requests are removed from list after response

4. **As a parent, I want to search for other parents and request connections**
   - ✅ Search by email/phone number
   - ✅ Display parent and children information
   - ✅ Send targeted or general connection requests

### Error Scenarios Tested:
- ✅ Network connectivity issues
- ✅ Invalid authentication tokens
- ✅ Malformed API responses
- ✅ Missing required data fields
- ✅ Server errors (4xx, 5xx)

## 📊 Test Data

Tests use consistent mock data representing realistic families:
- **Johnson Family**: 2 children (Emma, Alex)
- **Wong Family**: 3 children (Mia, Ryan, Zoe)  
- **Davis Family**: 2 children (Jake, Mia)

Mock data includes:
- Detailed child information (names, ages, grades, schools)
- Realistic connection request scenarios
- Various message types and target preferences

## 🔧 Development

### Adding New Tests
1. **Backend API Tests**: Add to `tests/integration/connections/`
2. **Frontend Component Tests**: Add to `parent-activity-web/src/components/__tests__/`
3. **Service Tests**: Add to `parent-activity-web/src/services/__tests__/`
4. **Unit Tests**: Add to `tests/unit/`

### Test Utilities
The `testHelpers.js` file provides:
- Mock user and child data
- JWT token generation
- Request validation functions
- Mock data creation utilities

## 📈 Coverage Goals

- **Backend API**: 100% endpoint coverage for connection requests
- **Frontend Components**: 90%+ component functionality coverage  
- **Service Layer**: 100% method coverage for connection APIs
- **Error Handling**: All error paths tested

## 🚨 Critical Test Requirements

Before deploying connection request changes:
1. ✅ All tests must pass
2. ✅ No regressions in existing functionality
3. ✅ New features have corresponding tests
4. ✅ Error handling is comprehensive
5. ✅ Performance within acceptable limits

Run `npm run test:all` to verify all requirements are met!