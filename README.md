# Istanbul Barber Booking — Demo Pack

This folder contains product docs for a demo booking system for the Istanbul barbershop.

Docs:
- docs/00_project_overview.md
- docs/01_db_schema.sql
- docs/02_seed.sql
- docs/03_api.md
- docs/04_ux_screens.md
- docs/05_slot_generation.md
- docs/06_landing_copy.md
- docs/07_pitch.md
- docs/08_roles_rls.md
- docs/09_auth_setup.md

Apps:
- apps/mobile (React Native + Expo)
- apps/web (Next.js)

Quick start (after installing deps):
- npm install
- npm run dev:mobile
- npm run dev:web

Env:
- .env.example → .env
- apps/web/.env.example → apps/web/.env.local
- apps/mobile/.env.example → apps/mobile/.env

Notes:
- Expo SDK 50 warns on Node 18 because @expo/metro-config pulls React Native tooling that expects Node >=20.19.4.
  If you hit runtime issues, upgrade Node or downgrade Expo SDK.
- Without Supabase env vars, apps use demo data.
- Auth + RLS setup is in supabase/migrations/0003_auth_rls.sql.
- Admin role setup instructions: docs/09_auth_setup.md
- Calendar drag & drop uses rpc_reschedule_appointment (supabase/migrations/0004_reschedule.sql).
- Barber photos column added in supabase/migrations/0005_barber_photos.sql.
- Storage: create public bucket `barber-photos` for uploads (docs/09_auth_setup.md).
- Telegram/SMS notifications: settings table + edge function (supabase/migrations/0006_notifications.sql, 0007_notification_templates.sql) + delivery logs (0008_notification_logs.sql).
- Appointment validation for working hours/time off: supabase/migrations/0009_appointment_validation.sql.
