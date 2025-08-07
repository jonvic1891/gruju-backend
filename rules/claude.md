## DEPLOYMENT REQUIREMENTS
- NEVER work locally - always deploy directly to Firebase
- User only uses the live Firebase app at https://gruju-parent-activity-app.web.app
- Backend runs on Heroku at https://gruju-backend-5014424c95f2.herokuapp.com with PostgreSQL database
- Any code changes must be immediately built and deployed with:
  - npm run build
  - firebase deploy --only hosting
- Always deploy changes before asking user to test
- When user says "I don't see the changes" = immediately deploy to Firebase

## MOBILE-FIRST DESIGN REQUIREMENTS
- **CRITICAL**: This app must be fully optimized for mobile devices (phones and tablets)
- All components must be responsive and work seamlessly on screens from 320px to 1200px+
- Touch targets must be minimum 44px for proper finger navigation
- Font sizes must be minimum 16px on inputs to prevent iOS zoom
- Modals must be full-screen or near full-screen on mobile devices
- Navigation must be thumb-friendly with proper spacing
- No horizontal scrolling should occur on any screen size
- Loading states and interactions must be optimized for touch devices
- All text must be readable without zooming on mobile devices
- Forms must be easy to use with on-screen keyboards
- Calendar and grid layouts must adapt properly to mobile screens

## standard Workflow

1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md

2. The plan should have a list of todo items that you can check off as you complete them

3. Before you begin working, check in with me and I will verify the plan

4. Then, begin working on the todo items, marking them as complete as you go

5. Please every step of the way just give me a high level explanation of what changes you made

6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity

7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information