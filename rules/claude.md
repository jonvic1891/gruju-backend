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

## NAVIGATION ARCHITECTURE RULES

**CRITICAL**: This React app uses a specific navigation architecture that must be preserved:

### React Router Structure
- Uses React Router with nested routes: `/children`, `/children/:childUuid/activities`, `/children/:childUuid/activities/:activityUuid`
- Dashboard component manages URL parameters and passes `selectedChildId` to ChildrenScreen
- ChildrenScreen conditionally renders either main children list or ChildActivityScreen based on `selectedChildId`

### Navigation State Management
- **Dashboard**: Resolves child UUIDs from URL to internal IDs via `children.find(c => c.uuid === childUuid)`
- **ChildrenScreen**: Responds to `initialSelectedChildId` prop changes to show/hide ChildActivityScreen
- **Critical useEffect**: ChildrenScreen must clear `selectedChild` when `initialSelectedChildId` becomes null

### Browser History Requirements
- **NEVER use `window.location.href`** - breaks React Router history
- **ALWAYS use React Router `navigate()`** with `{ replace: false }` to create proper history entries
- **NEVER add manual popstate handlers** - interferes with React Router navigation
- **NEVER force component re-mounting** with `key={location.pathname}` - causes flicker

### Back Navigation Flow
1. User clicks child card → `navigate(/children/uuid/activities)` → Dashboard sets `selectedChildId` → ChildrenScreen shows ChildActivityScreen
2. User presses browser back → React Router navigates to `/children` → Dashboard clears `selectedChildId` → ChildrenScreen clears `selectedChild` → Shows main children list
3. User clicks activity → `navigate(/children/uuid/activities/activityUuid)` → Shows activity detail
4. User presses browser back → React Router navigates to `/children/uuid/activities` → Shows child activities list

### Critical Code Patterns
```tsx
// ✅ Correct - Dashboard URL change handling
useEffect(() => {
  if (childUuid && children.length > 0 && path.includes('/activities')) {
    const child = children.find(c => c.uuid === childUuid);
    setSelectedChildId(child ? child.id : null);
  } else if (path === '/children') {
    setSelectedChildId(null); // Critical for back navigation
  }
}, [childUuid, children, location.pathname]);

// ✅ Correct - ChildrenScreen responding to selection changes  
useEffect(() => {
  if (initialSelectedChildId && children.length > 0) {
    const child = children.find(c => c.id === initialSelectedChildId);
    if (child) setSelectedChild(child);
  } else if (initialSelectedChildId === null) {
    setSelectedChild(null); // Critical for back navigation
  }
}, [initialSelectedChildId, children]);

// ✅ Correct navigation
navigate(targetURL, { replace: false });

// ❌ NEVER do this - breaks navigation
window.location.href = fullURL;
key={location.pathname} // Forces re-mounting
window.addEventListener('popstate', handler); // Interferes with Router
```

**When modifying navigation: Test both forward and backward navigation thoroughly before deployment.**

## VERSION MANAGEMENT & CACHE BUSTING

The app uses a **semantic version-based cache clearing system** instead of timestamp-based clearing:

### Version Control
- **Version file**: `/src/version.json` contains current app version
- **Semantic versioning**: Use format `major.minor.patch` (e.g., "1.2.3")
- **Controlled clearing**: Only clear cache when version changes, not on every build

### When to Increment Version
- **Major (1.0.0 → 2.0.0)**: Breaking changes, major navigation overhauls
- **Minor (1.0.0 → 1.1.0)**: New features, significant bug fixes that affect user experience
- **Patch (1.0.0 → 1.0.1)**: Small bug fixes, styling changes that don't require cache clearing

### Cache Clearing Behavior
```javascript
// ✅ Version changed - clear cache
localStorage: v1.0.0 → current: v1.1.0 = Clear storage
console: "🔥 App version changed from 1.0.0 to 1.1.0, clearing storage"

// ✅ Version unchanged - keep cache  
localStorage: v1.1.0 → current: v1.1.0 = Keep storage
console: "✅ App version 1.1.0 unchanged, keeping storage"
```

### Deployment Process
1. **For cache-clearing changes**: Update `src/version.json` before building
2. **For minor fixes**: Keep version unchanged to preserve user cache
3. **Build process**: Automatically injects version into HTML and JS/CSS URLs

This prevents unnecessary cache clearing while ensuring critical updates (like navigation fixes) properly clear cached data.