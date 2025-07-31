# 🗄️ Database Setup & Configuration Guide

This guide will help you connect your Parent Activity App to an actual Azure SQL Database and manage data migration.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Azure SQL Database Setup](#azure-sql-database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Using the Admin Panel](#using-the-admin-panel)
5. [Data Migration](#data-migration)
6. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Option 1: Use Admin Panel (Recommended)
1. Start the backend server: `npm start`
2. Open the admin panel: `admin-database-panel.html`
3. Login with admin credentials
4. Configure your Azure SQL connection
5. Test connection and migrate data

### Option 2: Direct Azure SQL Backend
1. Configure `.env` file with your Azure SQL credentials
2. Start Azure SQL backend: `node azure-sql-backend.js`
3. Your app will connect directly to Azure SQL

### Option 3: Environment Variable Switch
1. Set `DATABASE_MODE=azure` in your `.env` file
2. Start the unified backend: `npm start`
3. The system will automatically use Azure SQL

## ☁️ Azure SQL Database Setup

### Step 1: Create Azure SQL Database

1. **Login to Azure Portal**
   ```
   https://portal.azure.com
   ```

2. **Create SQL Database**
   - Search for "SQL databases"
   - Click "Create"
   - Choose your subscription and resource group
   - Database name: `ParentActivityDB`
   - Server: Create new or use existing

3. **Configure Server**
   - Server name: `your-server-name` (will become `your-server-name.database.windows.net`)
   - Admin login: `your_username`
   - Password: Create a strong password
   - Location: Choose your preferred region

4. **Set Pricing Tier**
   - For development: Basic (5 DTU, 2GB)
   - For production: Standard S0 or higher

5. **Configure Firewall**
   - Add your client IP address
   - Enable "Allow Azure services to access server"

### Step 2: Get Connection Details

After creation, note down:
- **Server name**: `your-server-name.database.windows.net`
- **Database name**: `ParentActivityDB`
- **Username**: `your_username`
- **Password**: `your_password`

## ⚙️ Environment Configuration

### Create .env File

Copy `.env.example` to `.env` and update:

```env
# Azure SQL Database Configuration
AZURE_SQL_SERVER=your-server-name.database.windows.net
AZURE_SQL_DATABASE=ParentActivityDB
AZURE_SQL_USER=your_username
AZURE_SQL_PASSWORD=your_password

# Database Mode (mock or azure)
DATABASE_MODE=azure

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development
```

### SSL Configuration

Azure SQL requires SSL. The system is configured with:
```javascript
options: {
  encrypt: true,                    // Required for Azure SQL
  trustServerCertificate: false,    // Use Azure's SSL certificate
  enableArithAbort: true,          // Required for some Azure SQL versions
  connectionTimeout: 30000,        // 30 second timeout
  requestTimeout: 30000            // 30 second request timeout
}
```

## 🎛️ Using the Admin Panel

### Access the Panel
1. Open `admin-database-panel.html` in your browser
2. Login with admin credentials:
   - Email: `admin@parentactivityapp.com`
   - Password: `demo123`

### Database Connection Tab

1. **Enter Azure SQL Details**
   - Server: `your-server.database.windows.net`
   - Database: `ParentActivityDB`
   - Username: `your_username`
   - Password: `your_password`

2. **Test Connection**
   - Click "🧪 Test Connection"
   - Wait for success confirmation
   - Fix any connection issues

3. **Switch to Azure SQL**
   - Click "🚀 Connect to Azure SQL"
   - System will initialize tables automatically
   - Confirm connection status

### Database Management Features

The admin panel provides:

- **🔌 Connection Setup**: Configure and test Azure SQL connections
- **📦 Data Migration**: Transfer demo data to Azure SQL
- **⚙️ Database Management**: View stats, create backups
- **💚 Health & Monitoring**: Monitor database health and performance

## 📦 Data Migration

### Automatic Migration

The system provides seamless data migration:

1. **Start with Mock Data**
   - System starts with demo users and data
   - Perfect for testing and development

2. **Connect to Azure SQL**
   - Configure Azure SQL connection
   - System creates all necessary tables

3. **Migrate Data**
   - Click "📦 Start Migration" in admin panel
   - All demo users, children, and activities transfer
   - Admin accounts preserved with same credentials

### Migration Details

What gets migrated:
- ✅ All demo user accounts (7 users including admins)
- ✅ Children profiles (3 children with activities)
- ✅ Activity data (3 sample activities)
- ✅ User roles and permissions
- ✅ Account status (active/inactive)

### Post-Migration

After migration:
- Demo credentials still work (`demo123` password)
- All admin functionality remains the same
- Data is now persistent in Azure SQL
- You can add real users and data

## 🔄 Switching Between Databases

### Via Admin Panel
- **Switch to Azure SQL**: Connects to your configured Azure database
- **Switch to Demo Mode**: Returns to mock database for testing

### Via Environment Variable
```env
DATABASE_MODE=mock    # Use mock database
DATABASE_MODE=azure   # Use Azure SQL database
```

### Via Direct Backend
```bash
# Use mock database backend
npm start

# Use Azure SQL backend directly
node azure-sql-backend.js
```

## 🛠️ Troubleshooting

### Common Connection Issues

#### 1. Firewall Issues
**Error**: `Failed to connect... getaddrinfo ENOTFOUND`

**Solution**:
- Add your IP to Azure SQL firewall rules
- Enable "Allow Azure services to access server"
- Check server name format: `server-name.database.windows.net`

#### 2. Authentication Issues
**Error**: `Login failed for user`

**Solution**:
- Verify username and password
- Check if user has database access permissions
- Ensure using SQL authentication (not Azure AD)

#### 3. SSL/TLS Issues
**Error**: `SSL connection required`

**Solution**:
- Ensure `encrypt: true` in connection config
- Use `trustServerCertificate: false` for Azure

#### 4. Timeout Issues
**Error**: `Connection timeout`

**Solution**:
- Increase `connectionTimeout` and `requestTimeout`
- Check network connectivity
- Verify Azure SQL server is running

### Database Performance

#### Connection Pooling
The system uses connection pooling:
```javascript
pool: {
  max: 10,                    // Maximum connections
  min: 0,                     // Minimum connections
  idleTimeoutMillis: 30000    // Connection idle timeout
}
```

#### Query Optimization
- Indexes created on frequently queried columns
- Proper data types for efficient storage
- Parameterized queries for security

### Backup and Recovery

#### Automatic Backups
Azure SQL provides automatic backups:
- Point-in-time restore (7-35 days)
- Long-term retention options available
- Geo-redundant backups for disaster recovery

#### Manual Backups
Use the admin panel "💾 Create Backup" feature or Azure Portal:
- Export to BACPAC file
- Copy to different regions
- Restore to different servers

## 📊 Monitoring and Maintenance

### Health Checks
The admin panel provides:
- Connection status monitoring
- Database performance metrics
- User activity statistics
- Error logging and reporting

### Database Maintenance
Regular maintenance tasks:
- Monitor connection pool usage
- Review query performance
- Update statistics
- Plan for scaling needs

### Scaling Considerations

#### Development
- Basic tier (5 DTU) sufficient for testing
- Single database deployment

#### Production
- Standard S1+ for production workloads
- Consider elastic pools for multiple databases
- Enable read replicas for high availability

## 🔐 Security Best Practices

### Connection Security
- Always use SSL/TLS encryption
- Store credentials in environment variables
- Use Azure Key Vault for production secrets
- Implement proper firewall rules

### Access Control
- Use least privilege principle
- Create separate database users for different components
- Regular password rotation
- Monitor login attempts

### Data Protection
- Enable Transparent Data Encryption (TDE)
- Implement Always Encrypted for sensitive data
- Regular security assessments
- Backup encryption

## 📈 Next Steps

### Production Deployment
1. **Secure Configuration**
   - Use Azure Key Vault for secrets
   - Implement Azure AD authentication
   - Configure proper firewall rules

2. **High Availability**
   - Enable geo-replication
   - Set up automatic failover groups
   - Configure backup retention policies

3. **Monitoring**
   - Enable Azure SQL Analytics
   - Set up alerting rules
   - Implement performance monitoring

4. **Scaling**
   - Monitor DTU/vCore usage
   - Plan for elastic scaling
   - Consider read replicas

### Development Workflow
1. **Start with Mock Database**
   - Develop and test features
   - Use demo data for initial development

2. **Test with Azure SQL**
   - Migrate demo data to Azure SQL
   - Test with real database performance

3. **Production Deployment**
   - Deploy with production Azure SQL configuration
   - Migrate real user data
   - Monitor and optimize

---

## 🆘 Support

Need help? Check these resources:

- **Admin Panel**: Built-in connection testing and health monitoring
- **System Logs**: Available through admin panel
- **Azure Documentation**: [Azure SQL Database docs](https://docs.microsoft.com/en-us/azure/sql-database/)
- **GitHub Issues**: Report issues in the project repository

## 🎯 Summary

This system provides three flexible ways to connect to your actual SQL database:

1. **🎛️ Admin Panel**: User-friendly interface for database management
2. **⚙️ Environment Configuration**: Simple variable-based switching
3. **🔄 Direct Backend**: Direct Azure SQL backend server

Choose the approach that best fits your workflow and requirements!

---

**Happy coding! 🚀**