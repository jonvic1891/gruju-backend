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
   ```bash
   cd backend
   npm install @azure/communication-sms mssql dotenv
   ```

2. **Configure Environment**:
   - Copy `backend/.env.example` to `backend/.env`
   - Update with your actual Azure and database credentials

3. **Initialize Database** (already done by setup script):
   ```bash
   cd backend
   npx ts-node src/scripts/initSMSDatabase.ts
   ```

4. **Add Routes to Server**:
   Add these lines to your main server file:
   ```typescript
   import smsConfigRoutes from './routes/smsConfig';
   import smsRoutes from './routes/sms';
   
   app.use('/api/sms-config', smsConfigRoutes);
   app.use('/api/sms', smsRoutes);
   ```

### 2. Frontend Setup

1. **Add Navigation Route**:
   Add the SMS Config screen to your navigation:
   ```typescript
   import SMSConfigScreen from '../screens/settings/SMSConfigScreen';
   
   // Add to your stack navigator
   <Stack.Screen 
     name="SMSConfig" 
     component={SMSConfigScreen} 
     options={{ title: 'SMS Configuration' }}
   />
   ```

2. **Update API Base URL**:
   Update the `API_BASE_URL` in `src/services/smsService.ts` to match your backend URL.

## API Endpoints

### SMS Configuration Management
- `GET /api/sms-config` - List all configurations
- `GET /api/sms-config/default` - Get default configuration
- `GET /api/sms-config/:id` - Get specific configuration
- `POST /api/sms-config` - Create new configuration
- `PUT /api/sms-config/:id` - Update configuration
- `DELETE /api/sms-config/:id` - Delete configuration
- `POST /api/sms-config/:id/test` - Test configuration
- `POST /api/sms-config/validate` - Validate configuration

### SMS Sending
- `POST /api/sms/send` - Send single SMS
- `POST /api/sms/send-bulk` - Send bulk SMS
- `GET /api/sms/logs` - Get message logs
- `GET /api/sms/stats` - Get message statistics

## Database Tables

The system creates these tables:
- `sms_connection_configs` - Stores ACS connection configurations
- `sms_message_logs` - Logs all sent messages
- `sms_templates` - Stores message templates (for future use)

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
```typescript
const config = await smsService.createConfig({
  name: 'Production Config',
  connectionString: 'endpoint=https://...;accesskey=...',
  phoneNumber: '+1234567890',
  endpoint: 'https://your-resource.communication.azure.com',
  isActive: true,
  isDefault: true,
  environment: 'production'
});
```

### Sending an SMS
```typescript
const result = await smsService.sendSMS(
  '+1234567890', 
  'Hello from Parent Activity App!'
);
```

### Bulk SMS
```typescript
const result = await smsService.sendBulkSMS(
  ['+1234567890', '+0987654321'],
  'Event reminder: Soccer practice at 3 PM'
);
```

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
```bash
DEBUG=sms:* npm start
```

## Next Steps

1. **Templates**: Implement the SMS templates system
2. **Webhooks**: Add delivery status webhooks
3. **Analytics**: Enhanced reporting and analytics
4. **Scheduling**: Add scheduled SMS sending
5. **Opt-out**: Implement opt-out functionality

## Support

For Azure Communication Services setup, refer to:
- [Azure Communication Services Documentation](https://docs.microsoft.com/azure/communication-services/)
- `AZURE_SETUP_GUIDE.md` in the ParentActivityApp folder
