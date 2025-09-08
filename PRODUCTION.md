# Production Environment Setup

## Required Environment Variables

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Email Service (Resend)
```bash
RESEND_API_KEY=re_your-resend-api-key
```

### Push Notifications (VAPID)
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### Site Configuration
```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

## Production Checklist

✅ Debug logs removed from push notification system  
✅ VAPID keys moved to environment variables  
✅ Notification tracking re-enabled (RLS issues fixed)  
✅ Temporary debugging code removed  
✅ Production build tested successfully  
✅ Environment variables documented  

## Database Setup

Ensure the following SQL scripts have been executed in production:

1. **Push Subscriptions Table**: Run `recreate-push-subscriptions.sql`
2. **RLS Policies**: Run `match-notifications-tracking-policies.sql`

## Build Command

```bash
npm run build
```

## Notes

- The app includes PWA functionality with service workers
- Push notifications require HTTPS in production
- All debug console.log statements have been cleaned up for production
- Only essential error logging remains for production debugging