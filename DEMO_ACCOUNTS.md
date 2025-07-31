# Demo User Accounts

This document lists all the demo/test accounts available in the Parent Activity App for testing different roles and functionality.

## 🔐 Admin Accounts

### Super Admin Account
- **Username**: `admin`
- **Email**: `admin@parentactivityapp.com`
- **Phone**: `+1555000001`
- **Role**: `super_admin`
- **Status**: Active
- **Password**: `demo123` (or whatever you set during authentication)

**Permissions**: Full system access including:
- User management (create, edit, delete, role changes)
- SMS configuration management
- System administration
- All regular user features

### Admin Account
- **Username**: `manager`
- **Email**: `manager@parentactivityapp.com`
- **Phone**: `+1555000002`
- **Role**: `admin`
- **Status**: Active
- **Password**: `demo123`

**Permissions**: Admin access including:
- User viewing and status management
- SMS configuration management
- System monitoring
- All regular user features
- **Cannot**: Change user roles, delete users, perform super admin functions

## 👥 Regular User Accounts

### Active User Account 1
- **Username**: `john_doe`
- **Email**: `john@example.com`
- **Phone**: `+1234567890`
- **Role**: `user`
- **Status**: Active
- **Children**: Emma Doe (Soccer Practice)

### Active User Account 2
- **Username**: `jane_smith`
- **Email**: `jane@example.com`
- **Phone**: `+1987654321`
- **Role**: `user`
- **Status**: Active
- **Children**: Liam Smith (Piano Lessons)

### Active User Account 3
- **Username**: `parent_mike`
- **Email**: `mike@example.com`
- **Phone**: `+1555123456`
- **Role**: `user`
- **Status**: Active
- **Children**: Olivia Johnson (Art Class)

### Active User Account 4
- **Username**: `sarah_wilson`
- **Email**: `sarah@example.com`
- **Phone**: `+1555987654`
- **Role**: `user`
- **Status**: Active
- **Children**: None

### Inactive User Account
- **Username**: `inactive_user`
- **Email**: `inactive@example.com`
- **Phone**: `+1555555555`
- **Role**: `user`
- **Status**: Inactive
- **Purpose**: For testing deactivated account behavior

## 👶 Demo Children and Activities

### Emma Doe (Parent: john_doe)
- **Activity**: Soccer Practice
- **Date**: February 1, 2024
- **Time**: 3:00 PM - 4:30 PM
- **Website**: https://example.com/soccer

### Liam Smith (Parent: jane_smith)
- **Activity**: Piano Lessons
- **Date**: February 2, 2024
- **Time**: 2:00 PM - 3:00 PM

### Olivia Johnson (Parent: parent_mike)
- **Activity**: Art Class
- **Date**: February 3, 2024
- **Time**: 10:00 AM - 11:30 AM
- **Website**: https://example.com/art

## 🔑 Login Instructions

### For Testing Admin Features:
1. **Login as Super Admin**:
   ```
   Email: admin@parentactivityapp.com
   Password: [your demo password]
   ```
   
2. **Navigate to Admin Tab**: Look for the ⚙️ icon with "SA" badge
3. **Access Full Admin Features**: User management, SMS config, system admin

### For Testing Regular Features:
1. **Login as Regular User**:
   ```
   Email: john@example.com
   Password: [your demo password]
   ```
   
2. **Test Standard Features**: Children, activities, calendar, connections

## 🧪 Testing Scenarios

### Admin Role Testing
1. **Login as super admin** → Test all admin functions
2. **Create new admin user** → Test admin role assignment
3. **Login as regular admin** → Verify limited admin permissions
4. **Try to perform super admin functions** → Should be restricted

### User Management Testing
1. **View all users** in admin panel
2. **Search users** by name/email/phone
3. **Change user roles** (super admin only)
4. **Activate/deactivate users**
5. **Delete users** (super admin only, cannot delete self)

### SMS Configuration Testing
1. **Login as admin** → Access SMS config
2. **Login as regular user** → SMS config should not be visible
3. **Create/edit SMS configurations** as admin
4. **Test SMS connections** with demo configurations

### Role-Based Navigation Testing
1. **Login as different roles** → Verify correct tabs appear
2. **Admin users** → Should see admin tab with badge
3. **Regular users** → Should only see standard tabs
4. **Super admin** → Should see "SA" badge
5. **Regular admin** → Should see "A" badge

## 🚀 Quick Setup for Demo

### 1. Initialize Demo Data
The demo data is automatically loaded when the MockDatabase is initialized. No additional setup required.

### 2. Login Credentials
All demo accounts use the same password pattern. Set this in your authentication system during development.

### 3. Role Verification
You can verify roles work correctly by:
```javascript
// Check user role in auth context
const { user } = useAuth();
console.log('Current user role:', user?.role);

// Verify admin tab visibility
const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
```

## 🔧 Customizing Demo Data

### Adding New Demo Users
Edit `/backend/src/utils/mockDatabase.ts` in the `seedData()` method:

```typescript
this.users.push({
  id: this.nextUserId++,
  username: 'new_demo_user',
  email: 'newuser@example.com',
  phone: '+1555999999',
  password_hash: '$2a$12$dummy.hash.for.demo.purposes',
  role: 'user', // or 'admin' or 'super_admin'
  is_active: true,
  created_at: '2024-01-08T00:00:00Z',
  updated_at: '2024-01-08T00:00:00Z',
});
```

### Adding Demo Children
```typescript
this.children.push({
  id: this.nextChildId++,
  name: 'New Child Name',
  parent_id: 6, // Parent's user ID
  created_at: '2024-01-13T00:00:00Z',
  updated_at: '2024-01-13T00:00:00Z',
});
```

### Adding Demo Activities
```typescript
this.activities.push({
  id: this.nextActivityId++,
  child_id: 4, // Child's ID
  name: 'Swimming Lessons',
  start_date: '2024-02-04',
  end_date: '2024-02-04',
  start_time: '16:00',
  end_time: '17:00',
  website_url: 'https://example.com/swimming',
  created_at: '2024-01-23T00:00:00Z',
  updated_at: '2024-01-23T00:00:00Z',
});
```

## 📊 Demo Statistics

The demo database includes:
- **7 total users** (2 admin, 5 regular)
- **6 active users** (1 inactive for testing)
- **2 admin users** (1 super admin, 1 regular admin)
- **3 children** with activities
- **3 scheduled activities**
- **Sample connection requests** (if implemented)

## 🐛 Troubleshooting Demo Accounts

### Admin Tab Not Showing
- Verify user role in database/mock data
- Check authentication token includes role
- Ensure navigation logic checks for admin role

### Cannot Access Admin Features
- Confirm login with admin account
- Check middleware is properly protecting admin routes
- Verify JWT token includes role claim

### Demo Data Not Loading
- Check MockDatabase singleton initialization
- Verify seedData() method is being called
- Check console for any initialization errors

---

## 🎯 Testing Checklist

- [ ] Login as super admin (`admin@parentactivityapp.com`)
- [ ] Verify admin tab appears with "SA" badge
- [ ] Access user management and edit user roles
- [ ] Test SMS configuration management
- [ ] Login as regular admin (`manager@parentactivityapp.com`)
- [ ] Verify admin tab appears with "A" badge
- [ ] Confirm limited admin permissions
- [ ] Login as regular user (`john@example.com`)
- [ ] Confirm no admin tab visible
- [ ] Test standard user features
- [ ] Verify role restrictions work correctly

**Demo system is ready for comprehensive testing! 🎉**