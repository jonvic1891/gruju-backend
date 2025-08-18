# Gruju Parent Activity App - Claude Context

## Project Overview
A parent activity app for connecting children and organizing activities. Built with React frontend and Node.js/PostgreSQL backend.

## Key URLs
- **Frontend**: https://gruju-parent-activity-app.web.app
- **Backend**: https://gruju-backend-5014424c95f2.herokuapp.com

## Admin/Testing Endpoints

### Cleanup Recent Test Data
```bash
curl -X DELETE 'https://gruju-backend-5014424c95f2.herokuapp.com/api/admin/cleanup-recent-requests' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

**Purpose**: Removes recent accepted connection requests and active connections (last 2 hours) for testing purposes.

**Returns**: `{"success":true,"message":"Cleanup completed","deleted":{"requests":X,"connections":Y}}`

## Test Users
- **roberts10@example.com** - Parent with Emilia 10
- **roberts11@example.com** - Parent with Charlie 11  
- **charlie@example.com** - Additional test user

## Development Commands

### Frontend (React)
```bash
cd parent-activity-web
npm run build
firebase deploy --only hosting
```

### Backend (Node.js)
```bash
git add . && git commit -m "Your commit message"
git push heroku main
```

## Recent Issues Fixed
- ✅ Connection request acceptance (UUID vs ID mismatch)
- ✅ Multiple children selection in connection requests
- ✅ Navigation routing after adding connections
- ✅ Display names for connection requests

## Architecture Notes
- Frontend: React with TypeScript, Firebase Hosting
- Backend: Node.js Express, PostgreSQL on Heroku
- Database: Uses UUIDs for security, IDs for internal references
- Authentication: JWT tokens