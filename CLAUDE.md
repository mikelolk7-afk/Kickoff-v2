# Kickoff Manager — Claude Code Context

## Project
Browser-based football management game. Players manage fictional clubs,
compete in live leagues, ~1 match/day simulated server-side. Sits between
Top Eleven (accessible) and Football Manager (depth). No real player names.

## Stack
Next.js 14 App Router + TypeScript strict + Tailwind + shadcn/ui
Prisma + PostgreSQL (Supabase) + Redis (Upstash) + BullMQ
NextAuth v5 + Stripe + Resend + Three.js/R3F + React Query + Zustand
Vercel deployment

## Architecture Rules
- All game logic in /server — never in components
- API routes in /app/api — thin, delegate to /server
- Match engine (/server/engine) is pure functions, no DB/HTTP
- DB only via Prisma singleton in /lib/db.ts
- TypeScript strict, no any
- React Query for server state, Zustand for UI state only
- Credit balance validated server-side before every spend
- All credit transactions logged to transactions table
- Stripe webhook verifies signature before crediting

## Game Domain
- 10 division tiers, each with 10 clubs (human + AI fill)
- 18 match weeks per season (round robin H+A). Top 2 up, bottom 2 down.
- Matches simulated daily at 20:00 UTC via cron
- Cup: midweek Wednesday 20:00 UTC
- Continental: Thursday 20:00 UTC
- AI clubs fill empty slots. aiLevel 1-10 maps to tier.
- Credits (premium) and Coins (earned) are separate currencies
- Credits = convenience + cosmetics ONLY. Never sell match influence.

## Match Engine
attackRating = (FWD weighted avg + MID weighted avg*0.5)
             * tacticsAttackMult * moraleMult * formMult
defenceRating = (DEF weighted avg + GK.overall*0.30)
              * tacticsDefenceMult * moraleMult
Mentality 1-5: attack mult 0.80/0.90/1.00/1.10/1.22
               defence mult 1.20/1.10/1.00/0.92/0.80
Per-minute: homeChance=0.28+(homeAtk/(homeAtk+awayDef))*0.24
            awayChance=0.24+(awayAtk/(awayAtk+homeDef))*0.24
Momentum ±0.08 modifier. Post-match: ratings, form, morale, injury, table.

## Design
Dark theme default. Primary: #1a7a3c. Accent: #f0c040.
Home: #3a7bd5. Away: #d53a3a. BG: #0d0d0f. Panel: #13141a.
Desktop: sidebar nav. Mobile: bottom tab bar.

## Current Phase
Phase 2 — Retention Layer
Active modules: All Phase 1 + Transfers, Scouting, Training, Stadium/Facilities, Finances, Credits/Store.
Do NOT build: Cup, Continental, Chat, Notifications, Manager Profiles, Rivalries, Admin, Mobile polish, Onboarding.

## Cron Schedule
simulate-matches:   20:00 UTC daily
simulate-cup:       20:00 UTC Wednesday
simulate-continental: 20:00 UTC Thursday
process-training:   00:00 UTC Monday
process-scouting:   Every hour
process-upgrades:   Every hour
process-transfers:  Every 6 hours
daily-drip:         00:00 UTC daily
season-end:         00:00 UTC daily (checks if season complete)
