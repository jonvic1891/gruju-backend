# 🎯 Demo Account Maintenance Guide

This guide ensures demo accounts always work correctly and remain synchronized between frontend and backend.

## 📋 Quick Status Check

Run this command to verify all demo accounts are working:
```bash
node test-demo-accounts-comprehensive.js --quick
```

## 🔧 Maintenance Scripts

### 1. Comprehensive Testing Script
**File**: `test-demo-accounts-comprehensive.js`

**Purpose**: Tests all demo accounts for login, authentication, and data integrity.

**Usage**:
```bash
# Full test (login + token verification + children)
node test-demo-accounts-comprehensive.js --verbose

# Quick test (login only - faster)
node test-demo-accounts-comprehensive.js --quick

# Help
node test-demo-accounts-comprehensive.js --help
```

**What it tests**:
- ✅ Login functionality
- ✅ User data accuracy (role, username, family name)
- ✅ Token verification
- ✅ Children data access
- ✅ Expected children counts and names

### 2. Continuous Monitoring Script
**File**: `monitor-demo-accounts.js`

**Purpose**: Automated monitoring that can run as a cron job and send alerts.

**Usage**:
```bash
# Basic monitoring
node monitor-demo-accounts.js

# With Slack alerts
node monitor-demo-accounts.js --slack-webhook=https://hooks.slack.com/your-webhook

# Setup cron job (every 30 minutes)
*/30 * * * * /usr/bin/node /path/to/monitor-demo-accounts.js
```

## 🎭 Official Demo Accounts

**CRITICAL**: These 6 accounts must be identical in frontend and backend:

| Family | Email | Password | Role | Children |
|--------|-------|----------|------|----------|
| **Admin Family** | `admin@parentactivityapp.com` | `demo123` | `super_admin` | Emma Johnson |
| **Johnson Family** | `johnson@example.com` | `demo123` | `user` | Emma Johnson, Alex Johnson |
| **Davis Family** | `davis@example.com` | `demo123` | `user` | Jake Davis, Mia Davis |
| **Wong Family** | `wong@example.com` | `demo123` | `user` | Mia Wong, Ryan Wong, Zoe Wong |
| **Thompson Family** | `thompson@example.com` | `demo123` | `user` | Sophie Thompson, Oliver Thompson |
| **Miller Family** | `joe@example.com` | `demo123` | `user` | Theodore Miller |

## 🔄 Deployment Process

### When Frontend Changes Are Made

1. **Update demo accounts in frontend**:
   ```bash
   # Edit this file
   vi parent-activity-web/src/components/LoginScreen.tsx
   ```

2. **Test locally**:
   ```bash
   cd parent-activity-web
   npm start
   # Verify demo accounts display correctly
   ```

3. **Build and deploy**:
   ```bash
   cd parent-activity-web
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

4. **Verify deployment**:
   ```bash
   node test-demo-accounts-comprehensive.js --verbose
   ```

### When Backend Changes Are Made

1. **Update backend demo accounts** (if needed):
   ```bash
   # Check current backend accounts
   node debug-login.js
   ```

2. **Test backend**:
   ```bash
   node test-demo-accounts-comprehensive.js --quick
   ```

3. **Deploy backend** (if using Heroku):
   ```bash
   git add .
   git commit -m "Update demo accounts"
   git push heroku main
   ```

## 🚨 Troubleshooting

### Common Issues

#### 1. Demo Account Login Fails
**Symptoms**: `401 Unauthorized` or `Invalid credentials`

**Solutions**:
```bash
# Check if account exists in backend
node debug-login.js

# Test specific account
curl -X POST https://gruju-backend-5014424c95f2.herokuapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wong@example.com","password":"demo123"}'

# Check backend logs
heroku logs --tail -a gruju-backend
```

#### 2. Frontend Shows Wrong Demo Accounts
**Symptoms**: Missing families or wrong email addresses

**Solutions**:
```bash
# Check frontend demo accounts
grep -A 20 "const demoAccounts" parent-activity-web/src/components/LoginScreen.tsx

# Fix and redeploy
cd parent-activity-web && npm run build && cd .. && firebase deploy
```

#### 3. Token Verification Fails
**Symptoms**: `401` on `/auth/verify` endpoint

**Solutions**:
```bash
# Check API endpoint consistency
grep -r "auth/verify" parent-activity-web/src/

# Should be "/auth/verify" not "/api/auth/verify"
# Backend has endpoint at /auth/verify
```

#### 4. Children Data Missing
**Symptoms**: Empty children arrays or wrong children

**Solutions**:
```bash
# Check database children data
node -e "
const axios = require('axios');
(async () => {
  const login = await axios.post('https://gruju-backend-5014424c95f2.herokuapp.com/api/auth/login', {
    email: 'wong@example.com', password: 'demo123'
  });
  const children = await axios.get('https://gruju-backend-5014424c95f2.herokuapp.com/api/children', {
    headers: { Authorization: \`Bearer \${login.data.token}\` }
  });
  console.log(children.data);
})();
"
```

## 📊 Monitoring Setup

### Automated Monitoring (Recommended)

1. **Setup cron job**:
   ```bash
   crontab -e
   # Add this line:
   */30 * * * * /usr/bin/node /path/to/Claud-Clubs2/monitor-demo-accounts.js
   ```

2. **Setup Slack alerts** (optional):
   ```bash
   # Get Slack webhook URL from your Slack workspace
   # Apps → Incoming Webhooks → Add to Slack
   
   node monitor-demo-accounts.js --slack-webhook=https://hooks.slack.com/your-webhook-url
   ```

3. **Check logs**:
   ```bash
   tail -f demo-account-monitor.log
   ```

### Manual Monitoring

Run this weekly to ensure everything is working:
```bash
# Full comprehensive test
node test-demo-accounts-comprehensive.js --verbose

# Check recent test results
ls -la demo-account-test-results-*.json | tail -5
```

## 📁 File Structure

```
Claud-Clubs2/
├── test-demo-accounts-comprehensive.js    # Main testing script
├── monitor-demo-accounts.js               # Monitoring script
├── debug-login.js                         # Backend debugging
├── DEMO_ACCOUNT_MAINTENANCE.md           # This guide
├── DEMO_ACCOUNTS.md                       # User-facing demo info
├── firebase.json                          # Firebase deployment config
├── .firebaserc                           # Firebase project config
└── parent-activity-web/
    └── src/components/LoginScreen.tsx     # Frontend demo accounts
```

## ✅ Maintenance Checklist

### Weekly Checklist
- [ ] Run comprehensive test: `node test-demo-accounts-comprehensive.js --verbose`
- [ ] Check monitoring logs: `tail -20 demo-account-monitor.log`
- [ ] Verify website loads: Visit https://gruju-parent-activity-app.web.app
- [ ] Test one random demo account manually

### After Any Deployment
- [ ] Run quick test: `node test-demo-accounts-comprehensive.js --quick`
- [ ] Verify frontend shows all 6 families
- [ ] Check backend API endpoints work
- [ ] Test Wong family specifically (most recent addition)

### Monthly Deep Check
- [ ] Run full test with children validation
- [ ] Check database consistency
- [ ] Review alert logs
- [ ] Update this documentation if needed

## 🔒 Security Notes

- Demo accounts use weak passwords (`demo123`) - this is intentional for easy testing
- Admin account has `super_admin` role - normal users have `user` role
- All demo accounts are publicly documented - never use in production
- Database contains only demo data - safe for public access

## 📞 Emergency Contacts

If demo accounts are completely broken:

1. **Immediate fix**: Revert to last known working deployment
2. **Check logs**: Backend logs, monitoring logs, Firebase logs  
3. **Run diagnostics**: `node test-demo-accounts-comprehensive.js --verbose`
4. **Manual verification**: Test login at https://gruju-parent-activity-app.web.app

---

**Last Updated**: August 2025  
**Maintainer**: Demo Account System  
**Version**: 1.0