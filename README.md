# 🏠 Gruju - Parent Activity App

**Connect families and organize children's activities together**

A modern web application that helps parents connect with other families and coordinate children's activities, playdates, and social events.

## 🌟 Features

### 👨‍👩‍👧‍👦 Family Management
- **Family Profiles**: Create and manage family information
- **Child Profiles**: Add children with ages, interests, and activities
- **Parent Connections**: Connect with other parents in your area

### 📅 Activity Organization  
- **Activity Calendar**: View and manage children's activities
- **Shared Events**: Coordinate group activities and playdates
- **Activity Invitations**: Invite other families to join activities
- **Real-time Updates**: Stay informed about activity changes

### 💬 Communication
- **SMS Integration**: Send activity invitations via text message
- **Email Notifications**: Keep families updated via email
- **In-app Messaging**: Coordinate with other parents

### 🔐 Security & Privacy
- **Secure Authentication**: JWT-based user authentication
- **Role-based Access**: Admin, parent, and user roles
- **Data Protection**: Secure handling of family information

## 🚀 Live Demo

### 🌐 Try It Online
Visit: **[Your Firebase URL after deployment]**

### 👨‍👩‍👧‍👦 Demo Accounts
| Family | Email | Children | Password |
|--------|-------|----------|----------|
| Johnson | johnson@example.com | Emma, Alex | demo123 |
| Davis | davis@example.com | Jake | demo123 |
| Wong | wong@example.com | Mia, Ryan, Zoe | demo123 |
| Thompson | thompson@example.com | Sophie, Oliver | demo123 |
| Miller | joe@example.com | Theodore | demo123 |

## 🏗️ Architecture

### Frontend
- **Technology**: Progressive Web App (PWA)
- **Hosting**: Firebase Hosting
- **Features**: Responsive design, offline support, mobile-optimized

### Backend  
- **Technology**: Node.js with Express
- **Database**: Azure SQL Database
- **Authentication**: JWT tokens
- **APIs**: RESTful API with comprehensive endpoints

### Integration Services
- **SMS**: Twilio integration for text messaging
- **Email**: SendGrid integration for email notifications
- **Cloud**: Azure App Service hosting

## 📁 Project Structure

```
/
├── ParentActivityApp/          # Frontend application
│   ├── dist/                   # Production build
│   ├── assets/                 # Images and icons
│   ├── firebase.json           # Firebase configuration
│   ├── deploy.sh              # Deployment script
│   └── DEPLOYMENT_GUIDE.md    # Frontend deployment guide
├── azure-sql-backend.js       # Main backend server
├── package.json               # Backend dependencies
├── web.config                 # Azure deployment config
├── .env.example               # Environment variables template
├── BACKEND_DEPLOYMENT.md      # Backend deployment guide
└── README.md                  # This file
```

## 🚀 Deployment Guides

### Frontend Deployment (Firebase)
1. **Read**: [ParentActivityApp/DEPLOYMENT_GUIDE.md](ParentActivityApp/DEPLOYMENT_GUIDE.md)
2. **Run**: `./ParentActivityApp/deploy.sh`
3. **Result**: Your app live on Firebase Hosting

### Backend Deployment (Azure)
1. **Read**: [BACKEND_DEPLOYMENT.md](BACKEND_DEPLOYMENT.md)
2. **Choose**: Azure App Service or Heroku
3. **Result**: API accessible over internet

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ 
- Azure SQL Database access
- Firebase account (for deployment)

### Frontend Development
```bash
cd ParentActivityApp
python3 -m http.server 9000
# Visit http://localhost:9000
```

### Backend Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev

# Test connection
npm run test
```

### Database Setup
Your Azure SQL database is already configured with:
- ✅ 23 user accounts (including demo families)
- ✅ 9 children profiles
- ✅ 10 sample activities  
- ✅ 3 family connections
- ✅ Complete schema with all tables

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Database
AZURE_SQL_SERVER=gruju.database.windows.net
AZURE_SQL_DATABASE=gruju_test
AZURE_SQL_USER=your_username
AZURE_SQL_PASSWORD=your_password

# Security
JWT_SECRET=your_secure_random_string

# Optional: SMS/Email
TWILIO_ACCOUNT_SID=your_twilio_sid
SENDGRID_API_KEY=your_sendgrid_key
```

### CORS Configuration
Update allowed origins in `azure-sql-backend.js`:
```javascript
const cors = require('cors');
app.use(cors({
    origin: ['https://your-firebase-app.web.app', 'https://gruju.com'],
    credentials: true
}));
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Family & Children
- `GET /api/children` - Get user's children
- `POST /api/children` - Add new child
- `PUT /api/children/:id` - Update child info

### Activities
- `GET /api/activities` - Get family activities
- `POST /api/activities` - Create new activity
- `PUT /api/activities/:id` - Update activity

### Admin Endpoints
- `GET /api/admin/users` - Manage users (admin only)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/logs` - System logs

### Health & Status
- `GET /health` - Server health check
- `GET /database/status` - Database connection status

## 🧪 Testing

### Demo Mode
The app includes a comprehensive demo mode with:
- 5 realistic family accounts
- Pre-populated children and activities
- Sample connections between families
- SMS invitation simulation

### Testing Checklist
- [ ] Demo account login works
- [ ] Database connection shows "connected"
- [ ] Responsive design on mobile
- [ ] PWA installation prompt
- [ ] Offline functionality

## 🔒 Security Features

### Data Protection
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Input validation and sanitization

### Privacy Controls
- ✅ Role-based access control
- ✅ Secure session management
- ✅ Environment variable protection
- ✅ HTTPS enforcement

## 🤝 Contributing

This is a private family activity management application. For questions or support:

1. **Issues**: Document any bugs or feature requests
2. **Security**: Report security issues privately
3. **Features**: Suggest new family/activity features

## 📄 License

MIT License - See LICENSE file for details

---

## 🎯 Quick Start Summary

### For New Users:
1. **Try Demo**: Visit the live app and use demo accounts
2. **Create Account**: Register with your email
3. **Add Family**: Set up your family profile and children
4. **Connect**: Find and connect with other local families
5. **Organize**: Create and join activities together

### For Developers:
1. **Frontend**: Follow `ParentActivityApp/DEPLOYMENT_GUIDE.md`
2. **Backend**: Follow `BACKEND_DEPLOYMENT.md`  
3. **Database**: Already configured with Azure SQL
4. **Test**: Use demo accounts to verify functionality

---

**Made with ❤️ for families everywhere**

*Gruju helps families connect and create memorable experiences for their children through organized activities and meaningful relationships.*