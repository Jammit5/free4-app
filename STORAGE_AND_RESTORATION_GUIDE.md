# Free4 App - Storage and Restoration Guide

## Overview
This guide provides complete instructions for storing the Free4 app and restoring it later with full functionality. Follow these steps to ensure seamless restoration of your deployed application.

## Part 1: Pre-Storage Preparation

### 1.1 Final Code Commit
```bash
# Ensure all changes are committed
git add .
git commit -m "Final commit before storage - app ready for archival"
git push origin main
```

### 1.2 Document Current State
- Current Branch: `main`
- Latest Commit: Check with `git log --oneline -5`
- Deployment Status: Verify app is working at production URL
- Database Status: Confirm all tables and data are intact

### 1.3 Export Critical Configuration Data

#### Environment Variables to Document
**From Vercel Dashboard (vercel.com):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

**Important:** Save these values securely - you'll need them for restoration.

## Part 2: Storage Checklist

### 2.1 Git Repository Backup
Your code is safely stored in Git. Ensure you have:
- [ ] All commits pushed to remote repository
- [ ] Repository URL documented: `[YOUR_GIT_REPO_URL]`
- [ ] Access credentials (GitHub/GitLab account) documented

### 2.2 Vercel Configuration Backup
Document the following from your Vercel dashboard:
- [ ] Project name: `[YOUR_VERCEL_PROJECT_NAME]`
- [ ] Connected Git repository
- [ ] Build settings (should be auto-detected for Next.js)
- [ ] Environment variables (list above)
- [ ] Domain settings (if custom domain is used)

### 2.3 Supabase Configuration Backup
From your Supabase dashboard:
- [ ] Project name and organization
- [ ] Project URL and reference ID
- [ ] API keys (URL and anon key from settings)
- [ ] Database schema (see Part 3 below)
- [ ] Authentication settings
- [ ] Storage bucket settings (for avatars)
- [ ] Row Level Security policies

### 2.4 External Service Keys
- [ ] **Resend**: Email API key for contact forms
- [ ] **Mapbox**: Access token for maps functionality
- [ ] **VAPID**: Push notification keys (public/private pair)

## Part 3: Database Schema Documentation

### 3.1 Essential Tables Structure

**Users/Profiles (handled by Supabase Auth + profiles table)**
```sql
-- profiles table extends auth.users
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  phone_number text,
  phone_consent boolean DEFAULT false,
  latitude double precision,
  longitude double precision,
  location_name text,
  push_notifications_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Free4 Events**
```sql
CREATE TABLE free4_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location_name text,
  radius_km integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Matches**
```sql
CREATE TABLE matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_free4_id uuid REFERENCES free4_events(id) ON DELETE CASCADE,
  matched_free4_id uuid REFERENCES free4_events(id) ON DELETE CASCADE,
  time_overlap_minutes integer,
  distance_km double precision,
  meeting_point_lat double precision,
  meeting_point_lng double precision,
  score integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Friendships**
```sql
CREATE TABLE friendships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Push Subscriptions**
```sql
CREATE TABLE push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

**Notification Queue**
```sql
CREATE TABLE notification_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  notification_data jsonb NOT NULL,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

### 3.2 Row Level Security Policies
All tables have RLS enabled with policies allowing users to only access their own data.

### 3.3 Storage Buckets
- **avatars**: User profile pictures with public read access and authenticated upload

## Part 4: Restoration Instructions

### 4.1 Prerequisites
- Node.js 18+ installed
- Git installed
- Vercel CLI installed: `npm i -g vercel`
- Supabase account access
- All backed up credentials and keys

### 4.2 Code Restoration

```bash
# Clone repository
git clone [YOUR_GIT_REPO_URL] free4-app-restored
cd free4-app-restored

# Install dependencies
npm install

# Verify package.json and dependencies
npm audit
```

### 4.3 Supabase Restoration

#### Option A: Use Existing Project (Recommended)
1. Log into Supabase dashboard
2. Access your existing project
3. Verify all tables and data are intact
4. Get API keys from Settings > API

#### Option B: Create New Project (If needed)
1. Create new Supabase project
2. Run database migrations/setup:
   - Create tables using schema from Part 3.1
   - Set up RLS policies
   - Create storage bucket for avatars
   - Configure authentication settings

```sql
-- Run in Supabase SQL Editor if recreating database
-- [Include all table creation scripts from Part 3.1]
```

### 4.4 Environment Variables Setup

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=[your_supabase_url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your_anon_key]
SUPABASE_SERVICE_ROLE_KEY=[your_service_role_key]
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[your_vapid_public_key]
VAPID_PRIVATE_KEY=[your_vapid_private_key]
RESEND_API_KEY=[your_resend_key]
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=[your_mapbox_token]
```

### 4.5 Local Testing

```bash
# Test build
npm run build

# Start development server
npm run dev

# Test core functionality:
# - User registration/login
# - Event creation
# - Match algorithm
# - Push notifications
# - PWA features
```

### 4.6 Vercel Deployment Restoration

```bash
# Login to Vercel
vercel login

# Deploy to Vercel
vercel

# Configure environment variables in Vercel dashboard
# Settings > Environment Variables > Add all variables from .env.local

# Trigger production deployment
vercel --prod
```

### 4.7 Final Verification

**Core Features Testing:**
- [ ] User authentication works
- [ ] Event creation with geolocation
- [ ] Friend system functionality
- [ ] Match algorithm calculates correctly
- [ ] Push notifications send properly
- [ ] PWA installation works
- [ ] Admin statistics accessible (if admin user)
- [ ] Contact form sends emails
- [ ] Data export functionality
- [ ] German localization displays correctly

**Technical Verification:**
- [ ] All API routes respond correctly
- [ ] Database queries execute without errors
- [ ] Real-time subscriptions work
- [ ] Service worker loads properly
- [ ] Build completes without errors
- [ ] No console errors in browser

## Part 5: Important Notes

### 5.1 Critical Dependencies
- Ensure Node.js version compatibility (18+)
- Verify Supabase project isn't deleted due to inactivity
- Check Vercel project limits and billing
- Confirm external API keys haven't expired

### 5.2 Data Migration Considerations
- User data should persist in Supabase
- Push subscriptions may need re-registration if restored much later
- VAPID keys should remain the same for existing subscriptions

### 5.3 Security Considerations
- Rotate API keys if security is a concern
- Review RLS policies after restoration
- Test authentication flows thoroughly
- Verify CORS settings are correct

### 5.4 Troubleshooting Common Issues
- **Build Errors**: Check Node.js version and dependency conflicts
- **Database Connection**: Verify Supabase URL and keys
- **Push Notifications**: Confirm VAPID keys match and are valid
- **Maps Not Loading**: Check Mapbox token validity
- **Email Not Sending**: Verify Resend API key

## Part 6: Emergency Contacts and Resources

### Documentation Links
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API

### Support Channels
- Supabase Discord: https://discord.supabase.com
- Vercel Discord: https://discord.gg/vercel
- Next.js GitHub: https://github.com/vercel/next.js

---

**Last Updated**: [Current Date]
**App Version**: Production-ready with all features implemented
**Storage Prepared By**: [Your Name]

**Important**: Keep this guide with your backed up credentials and test the restoration process on a development environment before production restoration.