# Deployment Pipeline Configuration

## 🚀 Deployment Strategy

### Test Environment (Automatic)
- **Trigger**: Every code change made by Claude
- **Target**: Test environment with existing user data
- **Purpose**: Immediate testing and validation

### Production Environment (Manual)  
- **Trigger**: Explicit user request "deploy to production"
- **Target**: Clean production environment
- **Purpose**: Live application for end users

## 📋 Deployment Commands

### Test Deployment (Auto)
```bash
# Backend deployment
git add -A
git commit -m "Auto-deploy to test - $(date '+%Y-%m-%d %H:%M:%S')"
git push test-heroku main

# Frontend deployment  
cd parent-activity-web
npm run build
cd ..
firebase use gruju-parent-activity-app
firebase deploy --only hosting
```

### Production Deployment (Manual)
```bash
# Backend deployment
git add -A
git commit -m "Deploy to production - $(date '+%Y-%m-%d %H:%M:%S')"
git push production main

# Frontend deployment
cd parent-activity-web  
NODE_ENV=production npm run build
cd ..
firebase use gruju-production
firebase deploy --only hosting:production
```

## 🎯 Environment Targets

### Test Environment
- **Backend**: https://gruju-backend-5014424c95f2.herokuapp.com
- **Frontend**: https://gruju-parent-activity-app.web.app
- **Database**: Full test data with multiple users
- **Git Remote**: test-heroku
- **Firebase Project**: gruju-parent-activity-app

### Production Environment  
- **Backend**: https://gruju-d3d8121d3647.herokuapp.com
- **Frontend**: https://gruju-com.web.app → gruju.com (when DNS ready)
- **Database**: Clean with only admin user
- **Git Remote**: production  
- **Firebase Project**: gruju-production

## 🤖 Claude Code Behavior

### When User Requests Changes:
1. ✅ Make the requested code changes
2. ✅ Automatically deploy to test environment
3. ✅ Verify deployment successful
4. ✅ Report test environment URL for validation
5. ❌ Do NOT deploy to production unless explicitly requested

### When User Says "Deploy to Production":
1. ✅ Deploy current changes to production environment
2. ✅ Verify production deployment successful  
3. ✅ Report production URLs
4. ✅ Remind user of admin credentials

## 🔍 Verification Steps

### After Test Deployment:
- Backend health: `curl -I https://gruju-backend-5014424c95f2.herokuapp.com/api/auth/verify`
- Frontend access: Visit https://gruju-parent-activity-app.web.app
- Test login: roberts10@example.com, roberts11@example.com, charlie@example.com

### After Production Deployment:
- Backend health: `curl -I https://gruju-d3d8121d3647.herokuapp.com/api/auth/verify`  
- Frontend access: Visit https://gruju-com.web.app (or gruju.com)
- Admin login: admin@gruju.com / Admin123!

## 🚨 Critical Rules

1. **Never deploy to production automatically**
2. **Always deploy to test after changes**
3. **Require explicit "deploy to production" command**
4. **Verify deployments before confirming success**
5. **Keep test and production environments synchronized in code but separate in data**