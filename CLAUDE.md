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

## 🚨 CRITICAL SECURITY POLICY: UUID-ONLY FRONTEND

**MANDATORY RULE: The frontend MUST NEVER use numeric IDs for any user-facing operations.**

### UUID-Only Policy
1. **FORBIDDEN**: All numeric `id`, `child_id`, `parent_id`, `activity_id`, `invitation_id` fields
2. **REQUIRED**: Always use UUID fields: `uuid`, `child_uuid`, `parent_uuid`, `activity_uuid`, `invitation_uuid`
3. **API CALLS**: All API endpoints must receive UUID parameters, never numeric IDs
4. **DATA TYPES**: All TypeScript interfaces marked numeric IDs as `// DEPRECATED: Backend only`

### Conversion Guide
- `child_id` → `child_uuid` (string)
- `parent_id` → `parent_uuid` (string) 
- `activity_id` → `activity_uuid` (string)
- `invitation_id` → `invitation_uuid` (string)
- `connection_id` → `connection_uuid` (string)

### Why UUIDs Only?
- **Security**: Numeric IDs expose database structure and enable enumeration attacks
- **Privacy**: UUIDs prevent unauthorized access to other users' data
- **Scalability**: UUIDs work across distributed systems
- **Compliance**: Required for proper data protection

### Frontend Implementation
- All API service methods use UUID parameters
- All React components pass UUIDs between components
- All state management uses UUIDs as keys
- All routing uses UUIDs in URL parameters

### Backend Compatibility
- Backend still uses numeric IDs internally for database efficiency
- Backend accepts both UUIDs and IDs during transition period
- Backend always returns both ID and UUID fields in responses
- Frontend MUST ignore numeric ID fields and only use UUIDs

**⚠️ Any code that uses numeric IDs in the frontend is a SECURITY VULNERABILITY and must be immediately converted to UUIDs.**

## Database Status Values

### Connection Request Status
Connection requests use the following status values (enforced by database constraint):
- **`pending`**: Request has been sent but not yet responded to
- **`accepted`**: Request was accepted, connection is active
- **`rejected`**: Request was rejected/declined by the target parent

**Important**: Always use `rejected` status for declined requests. Do not use `declined` - this value has been migrated to `rejected` for consistency.