# Free4 App - Project Summary

## Core Architecture
- **Tech Stack**: Next.js 15.5.2, React 19.1.0, TypeScript, TailwindCSS
- **Backend**: Supabase (auth + database)
- **Maps**: Mapbox GL + React-Leaflet (dual implementation) with geolocation support
- **Email**: Resend for contact forms
- **PWA**: Complete Progressive Web App with Service Worker and push notifications

## Key Features
1. **Authentication Flow**: Supabase auth with disclaimer modal on first visit
2. **Dashboard**: Main user interface post-login
3. **Event System**: Users create/manage Free4 events with auto-detected geolocation
4. **Match System**: Sophisticated matching algorithm based on time overlap + distance filtering
5. **Profile Management**: User profiles with avatar storage and friendship system
6. **Contact System**: Next.js API route `/api/contact` (no PHP)
7. **PWA Features**: Installable app, offline support, push notifications
8. **Push Notifications**: Automatic notifications for new matches and friend requests

## Important Components Structure
- `src/app/page.tsx`: Entry point with disclaimer → auth → dashboard flow
- `src/components/Dashboard.tsx`: Main logged-in interface
- `src/components/AuthForm.tsx`: Login/register forms
- `src/components/*Modal.tsx`: Various modals (Profile, Events, Matches, Contact, etc.)
- `src/components/CreateEventModal.tsx`: Event creation with geolocation auto-detection
- `src/components/MapBox*` & `src/components/OSM*`: Dual map implementations with user location markers
- `src/components/PWAInstallPrompt.tsx`: Smart PWA installation prompt
- `src/components/PushNotificationSettings.tsx`: Push notification management UI
- `src/app/api/matches/route.ts`: Core matching algorithm with comprehensive logging
- `src/app/api/contact/route.ts`: Contact form handler
- `src/app/api/push/route.ts`: Push notification server using web-push
- `src/hooks/usePushNotifications.ts`: Client-side push notification management
- `src/hooks/useBackgroundSync.ts`: Background sync for offline functionality

## Database Schema (Supabase)
- Users/profiles with location data and friendship relationships
- free4_events table with geolocation and radius data
- matches table with detailed overlap calculations and meeting points
- push_subscriptions table for web push notifications
- friendships table for user relationships
- Avatar storage with RLS policies

## PWA & Offline Features
- `public/sw.js`: Complete Service Worker with caching strategies
- `public/manifest.json`: PWA manifest with German localization ("Treffen")
- Background sync for match updates when offline
- Installable on mobile and desktop platforms
- Push notifications with VAPID keys

## Geolocation Features
- Auto-detect user location when creating events
- Reverse geocoding for location names
- User position markers on maps
- Distance-based event matching with Haversine formula

## Match Algorithm Details
- **Distance Filtering**: Uses larger of two event radii as maximum distance
- **Time Overlap Calculation**: Sophisticated overlap detection with minimum 30-minute requirement
- **Match Scoring**: Combines distance score (0-50) and time overlap score (0-50)
- **Meeting Points**: Calculates midpoint between matched locations
- **Comprehensive Logging**: Detailed debugging output for troubleshooting

## Authentication & Security
- Token-based auth with manual JWT validation
- Service role key for server-side operations
- Row Level Security policies on all database operations
- Secure push notification subscriptions

## Deployment
- Configured for Vercel with automatic deployments
- Complete PWA setup with offline functionality
- Environment configs for dev/production
- Web-push integration for notifications

## Recent Major Implementations (Latest Session)
1. **Geolocation Integration**: Auto-detect user position when creating Free4 events
2. **Complete PWA Implementation**: Service Worker, install prompt, offline support
3. **Push Notifications**: Full web-push implementation with automatic notifications
4. **Match Algorithm Debugging**: Enhanced logging revealed distance filtering works correctly
5. **UI Refinements**: PWA manifest localization, push notification settings improvements

## Debugging History
- **Match Algorithm Investigation**: User reported events not matching, investigation revealed correct behavior - events were filtered by distance (12.73km > 2km radius) before time overlap check
- **Time Overlap Function Verified**: calculateTimeOverlap() working perfectly, issue was distance filtering as intended
- **Comprehensive Logging Added**: Detailed match calculation logs for future debugging

## Known Working Flows
- User registration/login with Supabase
- Event creation with automatic geolocation detection
- Friend request system with acceptance/rejection
- Match calculation with distance + time overlap filtering
- PWA installation on mobile/desktop
- Push notifications for matches and friend requests
- Offline functionality with background sync

## Current State
- Fully functional PWA with comprehensive features
- Match algorithm working correctly with proper distance and time filtering
- Push notifications operational for user engagement
- All major features implemented and tested
- Ready for production use with automatic deployments