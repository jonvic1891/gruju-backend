# Gruju.com Custom Domain Setup Instructions

## Current Status
✅ Production Firebase project created: `gruju-production`
✅ Production site created: `gruju-com` 
✅ Production backend deployed: https://gruju-d3d8121d3647.herokuapp.com
✅ Production frontend deployed: https://gruju-com.web.app

## Step 1: Purchase gruju.com Domain
Purchase the domain from any registrar (GoDaddy, Namecheap, Google Domains, etc.)

## Step 2: Add Custom Domain in Firebase Console

1. **Open Firebase Console**: https://console.firebase.google.com/project/gruju-production/hosting/main

2. **Navigate to Hosting**:
   - Click on "Hosting" in the left sidebar
   - You should see the `gruju-com` site listed

3. **Add Custom Domain**:
   - Click on "Add custom domain" button
   - Enter: `gruju.com`
   - Click "Continue"

4. **Domain Verification**:
   Firebase will provide DNS records to add to your domain registrar:
   ```
   Type: TXT
   Name: @ (or leave blank for root domain)
   Value: [Firebase will provide this verification code]
   ```

## Step 3: Configure DNS Records at Your Domain Registrar

After domain verification, Firebase will provide these records:

### For Root Domain (gruju.com):
```
Type: A
Name: @ (or leave blank)
Value: 151.101.1.195

Type: A  
Name: @ (or leave blank)
Value: 151.101.65.195
```

### For WWW Redirect (optional):
```
Type: CNAME
Name: www
Value: gruju.com
```

## Step 4: Wait for DNS Propagation
- DNS changes can take 24-48 hours to propagate globally
- You can check propagation status at: https://www.whatsmydns.net/#A/gruju.com

## Step 5: SSL Certificate
- Firebase automatically provisions SSL certificates
- This happens after DNS verification is complete
- Certificate activation can take up to 24 hours

## Verification Commands

After setup is complete, verify with:

```bash
# Check DNS resolution
nslookup gruju.com

# Test HTTPS
curl -I https://gruju.com

# Check certificate
openssl s_client -connect gruju.com:443 -servername gruju.com
```

## Final Environment URLs

### Production (Clean Database)
- **Frontend**: https://gruju.com (after domain setup)
- **Backend**: https://gruju-d3d8121d3647.herokuapp.com
- **Admin**: admin@gruju.com / Admin123!

### Test (Full Test Data)  
- **Frontend**: https://gruju-parent-activity-app.web.app
- **Backend**: https://gruju-backend-5014424c95f2.herokuapp.com
- **Test Users**: roberts10@example.com, roberts11@example.com, charlie@example.com

## Firebase Console Links

- **Production Project**: https://console.firebase.google.com/project/gruju-production
- **Production Hosting**: https://console.firebase.google.com/project/gruju-production/hosting/main
- **Test Project**: https://console.firebase.google.com/project/gruju-parent-activity-app

## Troubleshooting

If domain setup fails:
1. Verify all DNS records are correct
2. Check DNS propagation status
3. Ensure domain ownership verification TXT record is still present
4. Contact Firebase support if SSL certificate doesn't provision

## Next Steps After Domain is Live

1. Test production environment with admin user
2. Update any hardcoded URLs in documentation
3. Set up monitoring/analytics for production
4. Configure backup schedules for production database