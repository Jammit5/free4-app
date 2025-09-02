# Free4 App - Project Summary

## Core Architecture
- **Tech Stack**: Next.js 15.5.2, React 19.1.0, TypeScript, TailwindCSS
- **Backend**: Supabase (auth + database)
- **Maps**: Mapbox GL + React-Leaflet (dual implementation)
- **Email**: Resend for contact forms

## Key Features
1. **Authentication Flow**: Supabase auth with disclaimer modal on first visit
2. **Dashboard**: Main user interface post-login
3. **Event System**: Users create/manage local events 
4. **Match System**: API endpoint `/api/matches` for user matching based on location/interests
5. **Profile Management**: User profiles with avatar storage
6. **Contact System**: Next.js API route `/api/contact` (no PHP)

## Important Components Structure
- `src/app/page.tsx`: Entry point with disclaimer → auth → dashboard flow
- `src/components/Dashboard.tsx`: Main logged-in interface
- `src/components/AuthForm.tsx`: Login/register forms
- `src/components/*Modal.tsx`: Various modals (Profile, Events, Matches, Contact, etc.)
- `src/components/MapBox*` & `src/components/OSM*`: Dual map implementations
- `src/app/api/matches/route.ts`: Core matching algorithm API
- `src/app/api/contact/route.ts`: Contact form handler

## Database Schema (Supabase)
- Users/profiles with location data
- Events table
- Matches table with user relationships
- Avatar storage with RLS policies

## Authentication & Security
- Token-based auth with Supabase cookies
- Recent auth optimizations (see git commits)
- Row Level Security policies on database

## Deployment
- Configured for Vercel
- PWA manifest included
- Environment configs for dev/production

## Recent Changes Context
- Moved from PHP contact form to Next.js API
- Auth system recently stabilized (token-based)
- Match triggers optimized to reduce useEffect spam