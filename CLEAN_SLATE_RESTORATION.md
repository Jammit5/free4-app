# Free4 App - Clean Slate Restoration Guide

## Overview
This guide assumes you've closed all service accounts and need to recreate everything from scratch. No existing data or accounts required.

---

## Phase 1: Create New Service Accounts

### 1.1 GitHub Account (if needed)
```
1. Go to: https://github.com
2. Sign up for free account
3. Verify email address
4. Note: Username will be part of your new repository URL
```

### 1.2 Supabase Account
```
1. Go to: https://supabase.com
2. Sign up with GitHub or email
3. Create new organization (free)
4. Create new project:
   - Name: free4-app (or your choice)
   - Region: Choose closest to you
   - Database password: Generate strong password and save it
5. Wait for project to initialize (2-3 minutes)
```

### 1.3 Vercel Account
```
1. Go to: https://vercel.com
2. Sign up with GitHub (recommended for easy deployment)
3. Connect your GitHub account
4. No project setup needed yet
```

### 1.4 Mapbox Account
```
1. Go to: https://account.mapbox.com/auth/signup/
2. Sign up for free account
3. Verify email
4. Go to: https://account.mapbox.com/access-tokens/
5. Copy your "Default public token" (starts with pk.)
6. Free tier: 50,000 map loads/month
```

### 1.5 Resend Account
```
1. Go to: https://resend.com
2. Sign up for free account
3. Verify email and domain (optional)
4. Go to API Keys section
5. Create new API key
6. Copy the key (starts with re_)
7. Free tier: 100 emails/day, 3,000 emails/month
```

---

## Phase 2: Repository Setup

### 2.1 Fork or Download Code
```bash
# Option A: Fork on GitHub (recommended)
1. Go to: https://github.com/Jammit5/free4-app
2. Click "Fork" button
3. Clone your fork:
   git clone https://github.com/YOUR_USERNAME/free4-app.git
   cd free4-app

# Option B: Download and create new repo
1. Download: https://github.com/Jammit5/free4-app/archive/main.zip
2. Extract to folder
3. Create new GitHub repository
4. Push code to your new repository
```

### 2.2 Install Dependencies
```bash
# Ensure Node.js 18+ is installed
node --version

# Install dependencies
npm install

# Verify no critical vulnerabilities
npm audit
```

---

## Phase 3: Database Setup

### 3.1 Configure Supabase Project
```
1. Open your Supabase project dashboard
2. Go to Settings > API
3. Copy these values:
   - Project URL
   - Project API Keys > anon public
   - Project API Keys > service_role (click "Reveal")
```

### 3.2 Create Database Schema
```
1. In Supabase dashboard: Go to "SQL Editor"
2. Open the file: DATABASE_SCHEMA_BACKUP.sql
3. Copy entire contents and paste into SQL Editor
4. Click "Run" to create all tables and policies
5. Verify tables created: Go to "Table Editor" tab
```

### 3.3 Set Up Storage
```
1. Go to "Storage" in Supabase dashboard
2. Create new bucket:
   - Name: avatars
   - Public bucket: Yes
   - File size limit: 1MB
   - Allowed MIME types: image/*
```

### 3.4 Configure Authentication
```
1. Go to "Authentication" > "Settings"
2. Set site URL to: http://localhost:3000 (for development)
3. Add production URL later after Vercel deployment
4. Email templates: Use defaults or customize
```

---

## Phase 4: Generate Push Notification Keys

### 4.1 Generate VAPID Keys
```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output will show:
# Public Key: BK-abc123...
# Private Key: xyz789...
# Save both keys - you'll need them in environment variables
```

---

## Phase 5: Environment Configuration

### 5.1 Create Environment File
```bash
# Create .env.local file with your new values:
cat > .env.local << 'EOF'
# Supabase Configuration (from Step 3.1)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Push Notifications (from Step 4.1)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK-abc123...
VAPID_PRIVATE_KEY=xyz789...

# External Services
RESEND_API_KEY=re_abc123...
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.abc123...

# Development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

---

## Phase 6: Local Testing

### 6.1 Test Build and Run
```bash
# Test production build
npm run build

# Start development server
npm run dev

# Open: http://localhost:3000
```

### 6.2 Verify Core Features
```
□ User registration works (creates profile in database)
□ User login works
□ Profile page loads
□ Can create Free4 event with location
□ Maps display correctly (Mapbox)
□ Push notification prompt appears
□ Contact form can be accessed
```

---

## Phase 7: Production Deployment

### 7.1 Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy project
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: free4-app (or your choice)
# - Directory: ./
# - Override settings? No
```

### 7.2 Configure Production Environment
```bash
# Set environment variables in Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add RESEND_API_KEY
vercel env add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

# Deploy to production
vercel --prod
```

### 7.3 Update Supabase Site URL
```
1. Copy your Vercel production URL (e.g., https://free4-app-xyz.vercel.app)
2. Go to Supabase > Authentication > Settings
3. Update "Site URL" to your production URL
4. Add production URL to "Redirect URLs" list
```

---

## Phase 8: Final Verification

### 8.1 Production Testing
```
□ Production site loads correctly
□ User registration/login works on production
□ All features work in production environment
□ PWA installation works on mobile
□ Push notifications work
□ Email contact form sends messages
□ Maps display correctly
□ No console errors
```

### 8.2 Admin Setup (Optional)
```
1. Register with your admin email address
2. Test admin statistics dashboard access
3. Admin emails are defined in code:
   - src/components/AdminStatsModal.tsx
   - Update with your new email if needed
```

---

## Phase 9: Cleanup Old Services

### 9.1 Safe to Delete After Successful Restoration
```
□ Old Supabase project (after new one works)
□ Old Vercel project (after new deployment works)
□ Old Mapbox account (if you created a new one)
□ Old Resend account (if you created a new one)
□ Old VAPID keys are replaced with new ones
```

---

## Important Notes

### Service Limits (Free Tiers)
- **Supabase**: 500MB database, 1GB bandwidth/month, 50,000 requests/month
- **Vercel**: 100GB bandwidth/month, 1000 build hours/month
- **Mapbox**: 50,000 map loads/month
- **Resend**: 3,000 emails/month, 100 emails/day

### Account Management
- Keep login credentials secure
- Most services support GitHub OAuth for easy access
- Consider using password manager for API keys
- Set up billing alerts if planning heavy usage

### Scaling Considerations
- All services have paid tiers if you exceed limits
- Supabase Pro: $25/month
- Vercel Pro: $20/month
- Mapbox: $5/1,000 additional requests
- Resend: $20/month for 50,000 emails

---

## Emergency Contacts

### Support Channels
- **Supabase**: Discord community or support tickets
- **Vercel**: Discord community or support tickets
- **Mapbox**: https://support.mapbox.com
- **Resend**: Email support
- **GitHub**: Support tickets for repository issues

### Documentation
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs

---

**Result**: Fresh installation with new accounts, no dependency on old services, fully functional Free4 app ready for users.