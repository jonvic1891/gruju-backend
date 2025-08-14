# DEPLOYMENT NOTES - IMPORTANT

## Frontend Deployment
- **NEVER reference React build process**
- Frontend is deployed to Firebase hosting ONLY
- Use `firebase deploy --only hosting` to deploy frontend changes
- Firebase serves from `parent-activity-web/build` (auto-generated)
- Frontend URL: https://gruju-parent-activity-app.web.app

## Backend Deployment  
- Backend is deployed to Heroku
- Use `git push heroku main` to deploy backend changes
- Backend URL: https://gruju-backend-5014424c95f2.herokuapp.com

## Development Workflow
1. Make code changes in `parent-activity-web/src/`
2. Test locally if needed
3. Deploy to Firebase: `firebase deploy --only hosting`
4. Make backend changes in `postgres-backend.js`
5. Deploy to Heroku: `git push heroku main`

## CRITICAL: 
- Never mention "React build" or "npm run build"
- Always deploy directly to Firebase hosting