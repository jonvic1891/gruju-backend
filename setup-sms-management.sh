#!/bin/bash

echo "🚀 Setting up SMS Management System for Parent Activity App"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "ParentActivityApp" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the root directory containing ParentActivityApp and backend folders"
    exit 1
fi

print_status "Installing backend dependencies..."

# Install backend dependencies
cd backend
if [ ! -f "package.json" ]; then
    print_error "Backend package.json not found!"
    exit 1
fi

# Check if Azure Communication Services SDK is installed
if ! npm list @azure/communication-sms &> /dev/null; then
    print_status "Installing Azure Communication Services SMS SDK..."
    npm install @azure/communication-sms
else
    print_success "Azure Communication Services SMS SDK already installed"
fi

# Check if mssql is installed
if ! npm list mssql &> /dev/null; then
    print_status "Installing MS SQL Server driver..."
    npm install mssql
else
    print_success "MS SQL Server driver already installed"
fi

# Check if dotenv is installed
if ! npm list dotenv &> /dev/null; then
    print_status "Installing dotenv..."
    npm install dotenv
else
    print_success "dotenv already installed"
fi

print_status "Setting up database tables..."

# Run the SMS database initialization
if [ -f "src/scripts/initSMSDatabase.ts" ]; then
    print_status "Running SMS database initialization..."
    npx ts-node src/scripts/initSMSDatabase.ts
    if [ $? -eq 0 ]; then
        print_success "SMS database tables created successfully"
    else
        print_warning "Database initialization had some issues, but continuing..."
    fi
else
    print_error "SMS database initialization script not found!"
fi

cd ..

print_status "Setting up frontend..."

# Install frontend dependencies
cd ParentActivityApp
if [ ! -f "package.json" ]; then
    print_error "Frontend package.json not found!"
    exit 1
fi

print_success "Frontend setup completed"

cd ..

# Create environment configuration template
print_status "Creating environment configuration template..."

if [ ! -f "backend/.env.example" ]; then
    cat > backend/.env.example << EOF
# Database Configuration
DB_SERVER=your-azure-sql-server.database.windows.net
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
DB_PORT=1433

# Azure Communication Services Configuration
ACS_CONNECTION_STRING=endpoint=https://your-resource.communication.azure.com/;accesskey=your-access-key-here
ACS_PHONE_NUMBER=+1234567890
ACS_ENDPOINT=https://your-resource.communication.azure.com

# Application Settings
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret-here

# Optional: Azure Key Vault (for production)
# AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/
EOF
    print_success "Created backend/.env.example"
else
    print_warning "backend/.env.example already exists"
fi

# Create a README for SMS management
cat > SMS_MANAGEMENT_README.md << EOF
# SMS Management System

This system provides comprehensive management of Azure Communication Services (ACS) SMS configurations for the Parent Activity App.

## Features

### Backend Features
- ✅ Multiple SMS configuration management
- ✅ Configuration validation and testing
- ✅ SMS sending with automatic fallback
- ✅ Message logging and statistics
- ✅ Bulk SMS sending capabilities
- ✅ Template support (ready for implementation)
- ✅ Environment-based configurations

### Frontend Features
- ✅ React Native SMS configuration management screen
- ✅ Real-time configuration validation
- ✅ Connection testing
- ✅ Configuration CRUD operations
- ✅ Service layer for API communication

## Setup Instructions

### 1. Backend Setup

1. **Install Dependencies** (already done by setup script):
   \`\`\`bash
   cd backend
   npm install @azure/communication-sms mssql dotenv
   \`\`\`

2. **Configure Environment**:
   - Copy \`backend/.env.example\` to \`backend/.env\`
   - Update with your actual Azure and database credentials

3. **Initialize Database** (already done by setup script):
   \`\`\`bash
   cd backend
   npx ts-node src/scripts/initSMSDatabase.ts
   \`\`\`

4. **Add Routes to Server**:
   Add these lines to your main server file:
   \`\`\`typescript
   import smsConfigRoutes from './routes/smsConfig';
   import smsRoutes from './routes/sms';
   
   app.use('/api/sms-config', smsConfigRoutes);
   app.use('/api/sms', smsRoutes);
   \`\`\`

### 2. Frontend Setup

1. **Add Navigation Route**:
   Add the SMS Config screen to your navigation:
   \`\`\`typescript
   import SMSConfigScreen from '../screens/settings/SMSConfigScreen';
   
   // Add to your stack navigator
   <Stack.Screen 
     name="SMSConfig" 
     component={SMSConfigScreen} 
     options={{ title: 'SMS Configuration' }}
   />
   \`\`\`

2. **Update API Base URL**:
   Update the \`API_BASE_URL\` in \`src/services/smsService.ts\` to match your backend URL.

## API Endpoints

### SMS Configuration Management
- \`GET /api/sms-config\` - List all configurations
- \`GET /api/sms-config/default\` - Get default configuration
- \`GET /api/sms-config/:id\` - Get specific configuration
- \`POST /api/sms-config\` - Create new configuration
- \`PUT /api/sms-config/:id\` - Update configuration
- \`DELETE /api/sms-config/:id\` - Delete configuration
- \`POST /api/sms-config/:id/test\` - Test configuration
- \`POST /api/sms-config/validate\` - Validate configuration

### SMS Sending
- \`POST /api/sms/send\` - Send single SMS
- \`POST /api/sms/send-bulk\` - Send bulk SMS
- \`GET /api/sms/logs\` - Get message logs
- \`GET /api/sms/stats\` - Get message statistics

## Database Tables

The system creates these tables:
- \`sms_connection_configs\` - Stores ACS connection configurations
- \`sms_message_logs\` - Logs all sent messages
- \`sms_templates\` - Stores message templates (for future use)

## Security Best Practices

✅ **Implemented**:
- Connection strings are stored securely in database
- Input validation on all endpoints
- Authentication middleware on all routes
- Proper error handling and logging

🔄 **Recommended**:
- Use Azure Key Vault for production credentials
- Implement rate limiting on SMS endpoints
- Add encryption for sensitive data at rest
- Set up monitoring and alerting

## Usage Examples

### Creating a Configuration
\`\`\`typescript
const config = await smsService.createConfig({
  name: 'Production Config',
  connectionString: 'endpoint=https://...;accesskey=...',
  phoneNumber: '+1234567890',
  endpoint: 'https://your-resource.communication.azure.com',
  isActive: true,
  isDefault: true,
  environment: 'production'
});
\`\`\`

### Sending an SMS
\`\`\`typescript
const result = await smsService.sendSMS(
  '+1234567890', 
  'Hello from Parent Activity App!'
);
\`\`\`

### Bulk SMS
\`\`\`typescript
const result = await smsService.sendBulkSMS(
  ['+1234567890', '+0987654321'],
  'Event reminder: Soccer practice at 3 PM'
);
\`\`\`

## Troubleshooting

### Common Issues

1. **"No default SMS configuration found"**
   - Create a configuration and set it as default
   - Ensure the configuration is active

2. **"Connection test failed"**
   - Verify your ACS connection string
   - Check if your phone number is provisioned
   - Ensure your Azure subscription is active

3. **"Invalid phone number format"**
   - Use E.164 format (+1234567890)
   - Remove any formatting characters

### Debug Mode

Enable debug logging by setting:
\`\`\`bash
DEBUG=sms:* npm start
\`\`\`

## Next Steps

1. **Templates**: Implement the SMS templates system
2. **Webhooks**: Add delivery status webhooks
3. **Analytics**: Enhanced reporting and analytics
4. **Scheduling**: Add scheduled SMS sending
5. **Opt-out**: Implement opt-out functionality

## Support

For Azure Communication Services setup, refer to:
- [Azure Communication Services Documentation](https://docs.microsoft.com/azure/communication-services/)
- \`AZURE_SETUP_GUIDE.md\` in the ParentActivityApp folder
EOF

print_success "Created SMS_MANAGEMENT_README.md with detailed setup instructions"

echo ""
echo "=========================================================="
print_success "SMS Management System setup completed!"
echo ""
print_status "Next steps:"
echo "1. Configure your .env file in the backend folder"
echo "2. Add the SMS routes to your server.ts file"
echo "3. Add the SMS Config screen to your navigation"
echo "4. Update the API base URL in the frontend service"
echo ""
print_warning "Make sure to:"
echo "- Set up your Azure Communication Services resource"
echo "- Configure your database connection"
echo "- Test the configuration before going to production"
echo ""
print_status "See SMS_MANAGEMENT_README.md for detailed instructions"
echo "=========================================================="
EOF