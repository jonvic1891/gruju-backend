# Environment Configuration

## Production Environment
- **Backend**: https://gruju-d3d8121d3647.herokuapp.com
- **Frontend**: https://gruju-parent-activity-app.web.app (will point to production backend)
- **Database**: Clean PostgreSQL with only admin user
- **Admin Access**: 
  - Email: admin@gruju.com
  - Password: Admin123!
  - Role: admin

## Test Environment  
- **Backend**: https://gruju-backend-5014424c95f2.herokuapp.com
- **Frontend**: https://gruju-parent-activity-app.web.app (development mode points to test backend)
- **Database**: Contains all existing test data and users
- **Test Users**: roberts10@example.com, roberts11@example.com, charlie@example.com

## Deployment Commands

### Production
```bash
# Backend
git push production main

# Frontend (production build)
cd parent-activity-web
NODE_ENV=production npm run build
firebase deploy --only hosting
```

### Test
```bash
# Backend  
git push test-heroku main

# Frontend (development - points to test backend automatically)
cd parent-activity-web
npm run build
firebase deploy --only hosting
```

## Environment Variables

### Production Backend (gruju)
- NODE_ENV: production
- DATABASE_MODE: production
- JWT_SECRET: gruju_jwt_secret_2024_super_secure_random_string_for_production_use_only

### Test Backend (gruju-backend)
- NODE_ENV: production
- DATABASE_MODE: test
- JWT_SECRET: gruju_jwt_secret_2024_super_secure_random_string_for_production_use_only

### Frontend
- Production build automatically uses production backend
- Development build automatically uses test backend
- Environment files: .env.production, .env.development