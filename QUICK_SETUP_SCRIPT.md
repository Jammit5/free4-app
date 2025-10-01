# Free4 App - Quick Setup Script

## Automated Restoration Commands

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/Jammit5/free4-app.git free4-app-restored
cd free4-app-restored

# Install dependencies (exact versions from package.json)
npm install

# Verify installation
npm audit --audit-level=moderate
```

### 2. Environment Configuration
```bash
# Create environment file
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://chkhtbqcifptqchmnelx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa2h0YnFjaWZwdHFjaG1uZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3Njk1NTYsImV4cCI6MjA3MTM0NTU1Nn0.1i1avx2yn8lNQHjMpPeNOMVEPyB8nBJqYa993gj3RFo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa2h0YnFjaWZwdHFjaG1uZWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc2OTU1NiwiZXhwIjoyMDcxMzQ1NTU2fQ.O_T7aZlmaFUwB1gv9iasyC-mJJFQnfn1Idxc2MMlR1Y

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK-6bjOeUeju60apk6HMCRqNVmuctgW8QIDtq8TXoF2A6YvxczbwH4IChkKcjeXyVWCjzxiMlgRuSSdHmfzECSM
VAPID_PRIVATE_KEY=MWRG7U_-95tqfOz0XeDIRtIEivIRNoaBRF6kCPAJfRQ

# External Services
RESEND_API_KEY=re_LYZumckt_FUPNiRkmK2hABGCCXhHZbsQj
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiamFtbWl0IiwiYSI6ImNtZXVqY3g1NjAwbXAyanIxaWlmdzl1MXEifQ.rQKas2Jz4pdktxAihOBqEQ

# Development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

### 3. Test Build and Development
```bash
# Test production build
npm run build

# Start development server
npm run dev
```

### 4. Deploy to Vercel
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (will prompt for project settings)
vercel

# Set environment variables in Vercel dashboard or via CLI:
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

## Critical Project Information

### Repository Details
- **Git Repository**: https://github.com/Jammit5/free4-app.git
- **Main Branch**: main
- **Node.js Version**: 18+ required
- **Package Manager**: npm

### Key Dependencies
- **Next.js**: 15.5.2
- **React**: 19.1.0
- **Supabase**: ^2.48.0
- **TailwindCSS**: ^4
- **TypeScript**: ^5

### Available Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

### Supabase Project
- **Project ID**: chkhtbqcifptqchmnelx
- **URL**: https://chkhtbqcifptqchmnelx.supabase.co
- **Database**: PostgreSQL with RLS enabled

### Required External Accounts
- **GitHub**: Jammit5 (repository access)
- **Supabase**: Project access required
- **Vercel**: Deployment platform
- **Mapbox**: Account "jammit"
- **Resend**: Email service account

## Verification Steps After Setup

1. **Frontend Test**:
   - Visit http://localhost:3000
   - Test user registration/login
   - Create a Free4 event
   - Verify map displays correctly

2. **Database Test**:
   - Check Supabase dashboard
   - Verify tables exist and have data
   - Test RLS policies work

3. **Push Notifications Test**:
   - Enable notifications in app
   - Create matching events
   - Verify notifications are received

4. **Production Test**:
   - Deploy to Vercel
   - Test all functionality on production URL
   - Verify PWA installation works

## Troubleshooting Quick Fixes

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Database Connection Issues
- Verify Supabase project is active
- Check API keys in environment variables
- Test connection from Supabase dashboard

### Push Notification Issues
- Confirm VAPID keys are exact matches
- Check browser notification permissions
- Verify service worker registration

This script assumes all external services (Supabase, Mapbox, Resend) remain active and accessible.