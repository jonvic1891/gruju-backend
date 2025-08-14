# SECURITY AUDIT - ID EXPOSURE AND ENUMERATION RISKS

## CRITICAL ISSUES IDENTIFIED

### 1. Sequential ID Enumeration Risk
**Risk**: Sequential IDs (1, 2, 3, ...) can be enumerated by attackers
**Impact**: 
- Attackers can discover all user IDs, child IDs, activity IDs
- Can attempt to access unauthorized resources by incrementing IDs
- Privacy breach through enumeration

**Current Usage**:
- Users: `id` (sequential)
- Children: `id` (sequential) 
- Activities: `id` (sequential)
- Connections: `id` (sequential)
- Activity Invitations: `id` (sequential)

### 2. Unnecessary ID Exposure
**Risk**: API responses include IDs not needed for UX
**Impact**:
- Exposes internal database structure
- Provides enumeration targets
- Privacy violations

**Examples from API responses**:
```javascript
// Users exposed in connections
{
  child1_parent_id: 134,  // ❌ NOT NEEDED for UX
  child2_parent_id: 133,  // ❌ NOT NEEDED for UX
}

// Children IDs exposed globally
{
  child_id: 134,          // ❌ Only needed for owner
  invited_child_id: 133   // ❌ Only needed for participants
}

// Activity participants showing all IDs
{
  parent_id: 134,         // ❌ NOT NEEDED for UX
  child_id: 133,          // ❌ NOT NEEDED for UX
  invitation_id: 167      // ❌ Only needed for actions
}
```

## SOLUTION PLAN

### Phase 1: Replace Sequential IDs with UUIDs
1. Add UUID columns to all tables
2. Generate UUIDs for existing records
3. Update all API endpoints to use UUIDs
4. Update frontend to handle UUIDs

### Phase 2: Minimize ID Exposure
1. Remove unnecessary IDs from API responses
2. Only return IDs required for frontend functionality
3. Use opaque tokens where possible

### Phase 3: Implement Secure ID Handling
1. Validate UUID format in API endpoints
2. Add rate limiting for ID-based endpoints
3. Audit all API responses for unnecessary data

## PRIORITY: CRITICAL
This should be implemented immediately due to security implications.