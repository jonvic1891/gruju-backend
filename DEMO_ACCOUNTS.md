# 🎯 Parent Activity App - Demo Accounts

All demo accounts are ready to use! Every account uses the same password for easy testing.

## 🔑 Universal Login Credentials
**Password**: `demo123` (for all accounts)  
**Website**: https://gruju-parent-activity-app.web.app

---

## 👨‍👩‍👧‍👦 Demo Families

### 🔹 **Admin Family**
- **Email**: `admin@parentactivityapp.com`
- **Password**: `demo123`
- **Children**: Emma Johnson (has color-coded activities with invitations)
- **Special**: Admin account with color-coded test activities

### 🔹 **Johnson Family**
- **Email**: `johnson@example.com`
- **Password**: `demo123`
- **Children**: Emma Johnson, Alex Johnson
- **Features**: Multi-child family

### 🔹 **Davis Family**
- **Email**: `davis@example.com`
- **Password**: `demo123`
- **Children**: Jake Davis, Mia Davis
- **Features**: Two-child family

### 🔹 **Wong Family**
- **Email**: `wong@example.com`
- **Password**: `demo123`
- **Children**: Mia Wong, Ryan Wong, Zoe Wong
- **Features**: Large family with 3 children

### 🔹 **Thompson Family**
- **Email**: `thompson@example.com`
- **Password**: `demo123`
- **Children**: Sophie Thompson, Oliver Thompson
- **Features**: Two-child family

### 🔹 **Miller Family**
- **Email**: `joe@example.com`
- **Password**: `demo123`
- **Children**: Theodore Miller
- **Features**: Single-child family

---

## 🎨 **Testing Features**

### **Best Account for Testing Color-Coded Activities**
Use **Admin Family** (`admin@parentactivityapp.com`) - Emma Johnson has activities with:
- 🔵 **Dark Blue**: Private activities (Soccer, Piano, Swimming)
- 🔷 **Light Blue**: Accepted invitations (Art Class, Dance Class)
- 🟢 **Green**: Pending invitation (Birthday Party)
- ⚫ **Grey**: Rejected invitation (Baseball Game)

### **Testing Multi-Date Activity Creation**
1. Login with any account
2. Select a child
3. Click "Add Activity"
4. Use the visual calendar to select multiple dates
5. Choose private/shared and invite connected families

### **Testing Time Selector**
- Full 24-hour support (12 AM to 11 PM)
- 15-minute intervals
- Visual confirmation of selected time

### **Testing Host-Only Editing**
- Only activity hosts can edit activities
- Non-hosts see "Only the activity host can edit this activity"

---

## 🚀 **Quick Test Checklist**

✅ **Login Test**: Try logging in with different families  
✅ **Calendar View**: Check weekly calendar with activities  
✅ **Add Activity**: Test visual date picker and time selector  
✅ **Multi-Date**: Create recurring activities across multiple dates  
✅ **Invitations**: Test private/shared activities with connected families  
✅ **Editing**: Test host-only editing restrictions  
✅ **Color Coding**: View color-coded activities (use Admin account)  

---

## 📱 **Mobile Testing**
The app is fully responsive and works great on mobile devices. All features including the calendar date picker are touch-friendly.

---

## 🔧 **Technical Notes**
- **Frontend**: React TypeScript hosted on Firebase
- **Backend**: Node.js/Express on Heroku with PostgreSQL
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: Clean PostgreSQL with only demo data
- **All passwords**: Consistently `demo123` for easy testing

**Enjoy testing the Parent Activity App! 🎉**