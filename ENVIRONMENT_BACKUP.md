# Free4 App - Environment Variables Backup

## Critical Configuration Values

**IMPORTANT**: Keep this file secure and private. These are your production credentials.

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://chkhtbqcifptqchmnelx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa2h0YnFjaWZwdHFjaG1uZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3Njk1NTYsImV4cCI6MjA3MTM0NTU1Nn0.1i1avx2yn8lNQHjMpPeNOMVEPyB8nBJqYa993gj3RFo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa2h0YnFjaWZwdHFjaG1uZWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc2OTU1NiwiZXhwIjoyMDcxMzQ1NTU2fQ.O_T7aZlmaFUwB1gv9iasyC-mJJFQnfn1Idxc2MMlR1Y
```

### Push Notifications (VAPID Keys)
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK-6bjOeUeju60apk6HMCRqNVmuctgW8QIDtq8TXoF2A6YvxczbwH4IChkKcjeXyVWCjzxiMlgRuSSdHmfzECSM
VAPID_PRIVATE_KEY=MWRG7U_-95tqfOz0XeDIRtIEivIRNoaBRF6kCPAJfRQ
```

### External Services
```
RESEND_API_KEY=re_LYZumckt_FUPNiRkmK2hABGCCXhHZbsQj
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiamFtbWl0IiwiYSI6ImNtZXVqY3g1NjAwbXAyanIxaWlmdzl1MXEifQ.rQKas2Jz4pdktxAihOBqEQ
```

### Environment-Specific
```
# For development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# For production (Vercel will auto-set this)
NEXT_PUBLIC_SITE_URL=https://your-app-domain.vercel.app
```

## Supabase Project Details
- **Project Reference**: chkhtbqcifptqchmnelx
- **Project URL**: https://chkhtbqcifptqchmnelx.supabase.co
- **Organization**: [Your Supabase Organization]

## Service Account Details
- **Resend**: Email service for contact forms
- **Mapbox**: Username "jammit" - Maps and geolocation services
- **VAPID**: Push notification keys (keep these exactly the same for existing subscriptions)

## Security Notes
- Service role key has full database access - keep secure
- VAPID keys must remain the same for existing push subscriptions to work
- Mapbox token is tied to "jammit" account
- All keys are currently active as of storage date

## Restoration Checklist
- [ ] Copy all values to new .env.local file
- [ ] Verify Supabase project is still active
- [ ] Confirm Mapbox account access
- [ ] Test Resend API key validity
- [ ] Validate VAPID keys work for push notifications

**Storage Date**: [Current Date]
**Last Verified**: [Current Date]