# Admin System Documentation

This document explains how to access and use the comprehensive admin system for the Parent Activity App.

## 🔐 Admin Access Control

### User Roles
- **User** (`user`): Regular app users with no admin privileges
- **Admin** (`admin`): Can access admin dashboard and manage SMS configurations
- **Super Admin** (`super_admin`): Full system access including user management and system operations

### How to Access Admin Panel

#### 1. **For New Installations**
After running the SMS setup script, a default super admin account is created:
- **Username**: `admin`
- **Email**: `admin@parentactivityapp.com`
- **Role**: `super_admin`
- **⚠️ Change the password immediately after first login!**

#### 2. **For Existing Users**
Admin access is role-based. The admin tab will only appear if your user account has `admin` or `super_admin` role.

### Making a User an Admin

#### Option 1: Database Update (Development)
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

#### Option 2: Via Super Admin (Production)
1. Login as super admin
2. Go to Admin → User Management
3. Select the user
4. Change their role to `admin` or `super_admin`

## 📱 Frontend Admin Features

### Admin Dashboard
**Path**: Admin Tab → Admin Dashboard
- **System Overview**: User stats, SMS stats, activity metrics
- **Quick Actions**: Direct access to common admin tasks
- **System Status**: Real-time status of critical services
- **Navigation**: Easy access to all admin functions

### SMS Configuration Management
**Path**: Admin Tab → SMS Configuration
- **Multi-environment support**: Development, staging, production configs
- **Real-time validation**: Test configurations before saving
- **Connection testing**: Verify Azure Communication Services connectivity
- **Default configuration**: Set which config to use by default
- **Secure storage**: Connection strings stored securely

### User Management
**Path**: Admin Tab → User Management  
**Required Role**: `admin` or `super_admin`
- **User listing**: View all users with search and filtering
- **Role management**: Change user roles (super admin only)
- **Account status**: Activate/deactivate user accounts
- **User deletion**: Permanently delete users (super admin only)

## 🔧 Backend Admin APIs

### Authentication
All admin APIs require:
```
Authorization: Bearer <jwt_token>
```

The JWT token must contain a user with `admin` or `super_admin` role.

### Admin API Endpoints

#### User Management
```
GET    /api/admin/users              # List all users
PUT    /api/admin/users/:id/role     # Update user role (super admin only)
PUT    /api/admin/users/:id/status   # Activate/deactivate user
DELETE /api/admin/users/:id          # Delete user (super admin only)
```

#### System Statistics
```
GET    /api/admin/stats              # Dashboard statistics
GET    /api/admin/logs               # System logs
```

#### System Operations
```
POST   /api/admin/system/backup      # Create system backup (super admin only)
```

#### SMS Configuration (Admin Required)
```
GET    /api/sms-config               # List SMS configurations
POST   /api/sms-config               # Create new configuration
PUT    /api/sms-config/:id           # Update configuration
DELETE /api/sms-config/:id           # Delete configuration
POST   /api/sms-config/:id/test      # Test configuration
```

## 🔒 Security Features

### Role-Based Access Control
- **Frontend**: Admin tab only visible to admin users
- **Backend**: Middleware protection on all admin routes
- **Database**: Role validation on user operations

### Admin Middleware Protection
```typescript
// Protect admin routes
router.use(enhancedAuthMiddleware);  // Verify JWT token with role
router.use(requireAdmin);            // Require admin/super_admin role

// Protect super admin routes
router.use(requireSuperAdmin);       // Require super_admin role only
```

### Security Best Practices
✅ **Implemented**:
- JWT token validation with role information
- Route-level access control
- Secure credential storage
- Input validation on all endpoints
- Cannot delete your own admin account

## 🚀 Setup Instructions

### 1. Initialize Database
Run the setup script to create admin tables and default admin user:
```bash
./setup-sms-management.sh
```

### 2. Backend Configuration
Add admin routes to your server:
```typescript
// In server.ts
import adminRoutes from './routes/admin';
import smsConfigRoutes from './routes/smsConfig';

app.use('/api/admin', adminRoutes);
app.use('/api/sms-config', smsConfigRoutes);
```

### 3. Frontend Navigation
The admin tab is automatically added to navigation for admin users. No additional setup required.

### 4. Create Admin Users
Use the default admin account or create new ones:
```sql
INSERT INTO users (username, email, phone, password_hash, role, is_active)
VALUES ('newadmin', 'admin2@example.com', '+1234567890', 'hashed_password', 'admin', 1);
```

## 📊 Admin Dashboard Features

### System Overview Cards
- **Total Users**: Active user count and weekly growth
- **SMS Sent**: Message statistics and daily activity
- **Activities**: Event tracking and weekly summaries
- **Connections**: User connection metrics

### Quick Actions
- Direct access to SMS configuration
- User management shortcuts
- System status checks

### System Status Monitoring
- Database connectivity status
- SMS service health
- Background job status

## 🔍 User Management Features

### User Search & Filtering
- Search by username, email, or phone
- Role-based filtering
- Activity status filtering

### User Operations
- View detailed user information
- Change user roles (admin/super admin only)
- Activate/deactivate accounts
- Delete users (super admin only)
- Account creation tracking

### Role Management
Visual role indicators:
- 🟢 **User**: Green badge
- 🟠 **Admin**: Orange badge  
- 🔴 **Super Admin**: Red badge

## 🛡️ Production Considerations

### Security Checklist
- [ ] Change default admin password
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS for admin endpoints
- [ ] Implement rate limiting on admin APIs
- [ ] Set up audit logging for admin actions
- [ ] Regular security audits

### Monitoring & Logging
- Track admin actions
- Monitor failed login attempts
- Alert on suspicious admin activity
- Regular backup procedures

### Backup & Recovery
- Automated database backups
- Admin configuration backups
- Disaster recovery procedures

## 🐛 Troubleshooting

### Common Issues

#### "Admin tab not showing"
- Check user role in database: `SELECT role FROM users WHERE id = ?`
- Ensure JWT token includes role claim
- Verify authentication middleware is working

#### "Access denied" errors
- Confirm user has correct role (admin/super_admin)
- Check JWT token validity
- Verify middleware order in routes

#### "Cannot access SMS config"
- SMS configuration requires admin role
- Check if user has admin privileges
- Verify admin middleware is applied to SMS routes

### Debug Commands
```sql
-- Check user roles
SELECT username, email, role, is_active FROM users;

-- View admin activity
SELECT * FROM audit_logs WHERE user_role IN ('admin', 'super_admin');

-- Check SMS configurations
SELECT name, environment, is_active, is_default FROM sms_connection_configs;
```

## 📝 Development Notes

### Adding New Admin Features
1. Create the backend API with admin middleware
2. Add frontend screen/component
3. Update navigation if needed
4. Add appropriate role checks
5. Test with different user roles

### Role Permission Matrix
| Feature | User | Admin | Super Admin |
|---------|------|-------|-------------|
| View Dashboard | ❌ | ✅ | ✅ |
| SMS Configuration | ❌ | ✅ | ✅ |
| View Users | ❌ | ✅ | ✅ |
| Change User Roles | ❌ | ❌ | ✅ |
| Delete Users | ❌ | ❌ | ✅ |
| System Backup | ❌ | ❌ | ✅ |

## 🔄 Future Enhancements

### Planned Features
- [ ] Advanced user analytics
- [ ] Automated system health checks
- [ ] Bulk user operations
- [ ] Custom admin themes
- [ ] Advanced logging dashboard
- [ ] Real-time notifications
- [ ] Mobile admin app

---

## Quick Start Checklist

1. ✅ Run `./setup-sms-management.sh`
2. ✅ Add admin routes to server
3. ✅ Login with default admin account
4. ✅ Change default admin password
5. ✅ Configure SMS settings
6. ✅ Create additional admin users
7. ✅ Test all admin functions

**Your admin system is now ready! 🎉**