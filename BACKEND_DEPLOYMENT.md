# 🚀 Gruju Backend - Azure Deployment Guide

## Overview
This guide will help you deploy your Gruju backend to Azure App Service, making your API accessible over the internet.

## 📋 Prerequisites
- Azure account (free tier available)
- Azure CLI installed
- Your Azure SQL database (already set up)
- Firebase frontend deployed

## 🔧 Backend Deployment Options

### Option 1: Azure App Service (Recommended)
**Pros**: Easy deployment, scalable, integrates with Azure SQL
**Cost**: ~$13/month for Basic plan, Free tier available

### Option 2: Azure Container Instances
**Pros**: Pay-per-use, good for testing
**Cost**: ~$0.0025/hour

### Option 3: Heroku
**Pros**: Simple deployment, free tier
**Cost**: Free tier available (with limitations)

---

## 🔵 Azure App Service Deployment

### Step 1: Install Azure CLI
```bash
# Install Azure CLI (if not already installed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login
```

### Step 2: Create Azure Resources
```bash
# Create resource group
az group create --name gruju-rg --location "East US"

# Create App Service plan (Free tier)
az appservice plan create --name gruju-plan --resource-group gruju-rg --sku F1 --is-linux

# Create web app
az webapp create --resource-group gruju-rg --plan gruju-plan --name gruju-backend --runtime "NODE|18-lts"
```

### Step 3: Configure Environment Variables
```bash
# Set environment variables for your app
az webapp config appsettings set --resource-group gruju-rg --name gruju-backend --settings \
    NODE_ENV=production \
    AZURE_SQL_SERVER=gruju.database.windows.net \
    AZURE_SQL_DATABASE=gruju_test \
    AZURE_SQL_USER=jonathan.roberts \
    AZURE_SQL_PASSWORD=Gruju1891 \
    JWT_SECRET=your_super_secure_jwt_secret_here_make_it_long_and_random \
    PORT=8080
```

### Step 4: Deploy Your Code
```bash
# Navigate to your backend directory
cd /home/jonathan/Claud-Clubs2

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial backend deployment"

# Set up deployment
az webapp deployment source config-local-git --name gruju-backend --resource-group gruju-rg

# Get deployment URL
az webapp deployment list-publishing-credentials --name gruju-backend --resource-group gruju-rg

# Deploy (replace with your actual URL)
git remote add azure https://gruju-backend.scm.azurewebsites.net/gruju-backend.git
git push azure main
```

### Step 5: Configure CORS
```bash
# Allow your Firebase app to access the API
az webapp cors add --resource-group gruju-rg --name gruju-backend --allowed-origins https://your-firebase-app.web.app
```

---

## 🟠 Heroku Deployment (Alternative)

### Step 1: Install Heroku CLI
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login to Heroku
heroku login
```

### Step 2: Create Heroku App
```bash
cd /home/jonathan/Claud-Clubs2

# Create Heroku app
heroku create gruju-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set AZURE_SQL_SERVER=gruju.database.windows.net
heroku config:set AZURE_SQL_DATABASE=gruju_test
heroku config:set AZURE_SQL_USER=jonathan.roberts
heroku config:set AZURE_SQL_PASSWORD=Gruju1891
heroku config:set JWT_SECRET=your_super_secure_jwt_secret_here
```

### Step 3: Deploy
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial backend deployment"

# Deploy to Heroku
git push heroku main
```

---

## 🔗 Update Frontend API URL

After your backend is deployed, you'll get a URL like:
- Azure: `https://gruju-backend.azurewebsites.net`
- Heroku: `https://gruju-backend.herokuapp.com`

### Update your Firebase app:
1. Edit `/home/jonathan/Claud-Clubs2/ParentActivityApp/dist/index.html`
2. Find line ~147: `const API_BASE_URL = 'https://your-backend-domain.com';`
3. Replace with your actual backend URL
4. Redeploy: `firebase deploy`

---

## 🔒 Security Checklist

### Environment Variables
- [ ] JWT_SECRET is long and random
- [ ] Database credentials are secure
- [ ] API keys are not in source code

### CORS Configuration
- [ ] Only allow your Firebase domain
- [ ] Remove localhost origins in production

### SSL/HTTPS
- [ ] Backend uses HTTPS (automatic with Azure/Heroku)
- [ ] Frontend uses HTTPS (automatic with Firebase)

---

## 📊 Testing Your Deployment

### Test Backend Health
```bash
curl https://your-backend-url.com/health
```

### Test Database Connection
```bash
curl https://your-backend-url.com/database/status
```

### Test Login
```bash
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"johnson@example.com","password":"demo123"}'
```

---

## 🚨 Troubleshooting

### Common Issues

1. **"Module not found"**
   - Make sure package.json includes all dependencies
   - Run `npm install` before deploying

2. **"Database connection failed"**
   - Check Azure SQL firewall allows Azure services
   - Verify connection string and credentials

3. **"CORS error"**
   - Add your Firebase domain to CORS origins
   - Check browser developer tools for exact error

4. **"502 Bad Gateway"**
   - Check application logs: `az webapp log tail --name gruju-backend --resource-group gruju-rg`
   - Ensure PORT environment variable is set correctly

### Useful Commands

```bash
# View Azure logs
az webapp log tail --name gruju-backend --resource-group gruju-rg

# View Heroku logs
heroku logs --tail --app gruju-backend

# Restart app
az webapp restart --name gruju-backend --resource-group gruju-rg
heroku restart --app gruju-backend
```

---

## 💰 Cost Breakdown

### Azure (Monthly)
- **Free Tier**: F1 plan (1GB RAM, 1GB storage) - FREE
- **Basic Tier**: B1 plan (1.75GB RAM, 10GB storage) - ~$13/month
- **Standard Tier**: S1 plan (1.75GB RAM, 50GB storage) - ~$56/month

### Heroku (Monthly)
- **Free Tier**: 512MB RAM, sleeps after 30min - FREE (deprecated)
- **Eco Plan**: $5/month, sleeps after 30min
- **Basic Plan**: $7/month, no sleeping

### Recommendations
- **Development**: Azure Free Tier or Heroku Eco
- **Production**: Azure Basic Tier (B1)

---

## 🎯 Success Checklist

- [ ] Backend deployed successfully
- [ ] Health endpoint responding
- [ ] Database connection working
- [ ] Environment variables configured
- [ ] CORS configured for Firebase domain
- [ ] Frontend updated with backend URL
- [ ] SSL/HTTPS enabled
- [ ] Demo accounts working end-to-end

Once complete, your Gruju app will be fully functional over the internet! 🌍