# 🎯 Demo Account System - Quick Reference

## ⚡ Quick Commands

```bash
# Test all demo accounts (recommended after any changes)
node test-demo-accounts-comprehensive.js --quick

# Full deployment verification
node verify-deployment.js

# Monitor demo accounts (can be setup as cron job)
node monitor-demo-accounts.js

# Debug backend accounts
node debug-login.js
```

## 🎭 The 6 Official Demo Accounts

| Family | Email | Password | Children |
|--------|-------|----------|----------|
| **Admin Family** | admin@parentactivityapp.com | demo123 | Emma Johnson |
| **Johnson Family** | johnson@example.com | demo123 | Emma & Alex Johnson |
| **Davis Family** | davis@example.com | demo123 | Jake & Mia Davis |
| **Wong Family** | wong@example.com | demo123 | Mia, Ryan & Zoe Wong |
| **Thompson Family** | thompson@example.com | demo123 | Sophie & Oliver Thompson |
| **Miller Family** | joe@example.com | demo123 | Theodore Miller |

## 🚀 After Any Deployment

1. **Quick Test**: `node verify-deployment.js --quick`
2. **Manual Check**: Visit https://gruju-parent-activity-app.web.app
3. **Verify Wong Family**: Click "Show Demo Accounts" → Should see Wong Family listed

## 📁 Key Files

- `test-demo-accounts-comprehensive.js` - Main testing script
- `monitor-demo-accounts.js` - Automated monitoring  
- `verify-deployment.js` - Post-deployment verification
- `DEMO_ACCOUNT_MAINTENANCE.md` - Complete maintenance guide
- `parent-activity-web/src/components/LoginScreen.tsx` - Frontend demo accounts

## 🔧 If Something Breaks

1. **Run diagnostics**: `node test-demo-accounts-comprehensive.js --verbose`
2. **Check specific account**: Test login manually at website
3. **Backend issues**: `node debug-login.js`
4. **Frontend issues**: Check if demo accounts display correctly
5. **See full guide**: `DEMO_ACCOUNT_MAINTENANCE.md`

---
**Live Website**: https://gruju-parent-activity-app.web.app  
**Last Verified**: August 2025 ✅