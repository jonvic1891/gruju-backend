# 🚀 Manual Backend Deployment Instructions

Your backend is ready to deploy! Since CLI tools require admin privileges, here are manual deployment options:

## 🟣 **Option 1: Heroku (Recommended - Free Tier)**

### Step 1: Create Heroku Account
1. Go to [Heroku.com](https://heroku.com)
2. Sign up for free account
3. Verify your email

### Step 2: Create New App
1. Click **"New"** → **"Create new app"**
2. App name: **"gruju-backend"** (or similar if taken)
3. Region: **United States**
4. Click **"Create app"**

### Step 3: Configure Environment Variables
In your Heroku app dashboard, go to **Settings** → **Config Vars** and add:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `AZURE_SQL_SERVER` | `gruju.database.windows.net` |
| `AZURE_SQL_DATABASE` | `gruju_test` |
| `AZURE_SQL_USER` | `jonathan.roberts` |
| `AZURE_SQL_PASSWORD` | `Gruju1891` |
| `JWT_SECRET` | `gruju_super_secure_jwt_secret_key_2024_production` |

### Step 4: Deploy Code
1. Go to **Deploy** tab
2. Choose **"GitHub"** as deployment method
3. Connect your GitHub account
4. Search for your repository
5. Click **"Connect"**
6. Click **"Deploy Branch"** (main branch)

**Your backend will be live at:** `https://gruju-backend.herokuapp.com`

---

## 🔵 **Option 2: Railway (Alternative)**

### Step 1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"**

### Step 2: Deploy from GitHub
1. Select **"Deploy from GitHub repo"**
2. Choose your repository
3. Railway will auto-detect Node.js

### Step 3: Add Environment Variables
In Railway dashboard → **Variables** tab:
- Same environment variables as Heroku above

**Your backend will be live at:** `https://your-app.railway.app`

---

## 🟠 **Option 3: Render (Free Tier)**

### Step 1: Create Render Account
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New Web Service"**

### Step 2: Connect Repository
1. Select your GitHub repository
2. Choose **"main"** branch
3. Runtime: **Node**
4. Build Command: `npm install`
5. Start Command: `node azure-sql-backend.js`

### Step 3: Environment Variables
Add the same variables as above in Render's environment section.

---

## ✅ **Files Already Prepared:**

✅ **package.json** - Updated with correct scripts  
✅ **Procfile** - Heroku deployment configuration  
✅ **CORS** - Updated to allow your Firebase app  
✅ **Environment Variables** - Ready for production  
✅ **Database Connection** - Configured with retry logic  
✅ **Keep-alive** - Prevents Azure SQL timeouts  

---

## 🔗 **After Backend is Deployed:**

### Update Your Frontend
1. Note your backend URL (e.g., `https://gruju-backend.herokuapp.com`)
2. Edit `/home/jonathan/Claud-Clubs2/ParentActivityApp/dist/index.html`
3. Find line ~147: `const API_BASE_URL = 'https://your-backend-domain.com';`
4. Replace with your actual backend URL
5. Redeploy frontend: `firebase deploy`

---

## 🧪 **Test Your Deployed Backend:**

Once deployed, test these URLs:

```bash
# Health check
https://your-backend-url.com/health

# Database status  
https://your-backend-url.com/database/status

# Demo login
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"johnson@example.com","password":"demo123"}'
```

---

## 🎯 **Success Checklist:**

- [ ] Backend deployed to cloud service
- [ ] Environment variables configured
- [ ] Health check returns "OK"
- [ ] Database status shows "connected"
- [ ] Demo login works
- [ ] Frontend updated with backend URL
- [ ] End-to-end test successful

---

## 🆘 **If You Need Help:**

1. **Deployment fails**: Check logs in your hosting platform
2. **Database connection fails**: Verify environment variables
3. **CORS errors**: Make sure your Firebase URL is in CORS origins

**Your backend is ready to deploy!** Choose your preferred platform and follow the steps above. 🚀