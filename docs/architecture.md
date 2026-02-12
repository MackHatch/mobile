# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MOBILE (Expo)                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Today       │  │ Habits       │  │ Insights    │  │ Settings     │  │
│  │ (toggle,    │  │ (CRUD,       │  │ (charts,    │  │ (push,       │  │
│  │  mood)      │  │  archive)    │  │  KPIs)      │  │  account)    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  │
│         │                │                 │                │          │
│         └────────────────┴─────────────────┴────────────────┘          │
│                                  │                                      │
│                    ┌─────────────▼─────────────┐                        │
│                    │   SQLite (Drizzle)        │                        │
│                    │   habits, completions,     │                        │
│                    │   mood_entries, outbox    │                        │
│                    └─────────────┬─────────────┘                        │
│                                  │                                      │
│                    ┌─────────────▼─────────────┐                        │
│                    │   Outbox (pending ops)    │                        │
│                    │   habit.create,           │                        │
│                    │   completion.set,         │                        │
│                    │   mood.set                │                        │
│                    └─────────────┬─────────────┘                        │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                         HTTPS     │     JWT Bearer
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Fastify + Prisma)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ /auth      │  │ /habits    │  │ /sync      │  │ /checkins        │  │
│  │ /oauth     │  │            │  │ (batch     │  │ /push            │  │
│  │            │  │            │  │  ops)      │  │                  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────────┬─────────┘  │
│        │               │               │                  │            │
│        └───────────────┴───────────────┴──────────────────┘            │
│                                    │                                     │
│                        ┌───────────▼───────────┐                        │
│                        │   PostgreSQL          │                        │
│                        │   users, habits,      │                        │
│                        │   habit_completions,  │                        │
│                        │   mood_entries,       │                        │
│                        │   sync_ops, oauth_*   │                        │
│                        └───────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **UI → SQLite → Outbox**
   - User actions (toggle habit, set mood) write immediately to local SQLite.
   - Each write enqueues an op in the outbox (`habit.create`, `completion.set`, `mood.set`).

2. **Sync: Outbox → `/sync` → Postgres**
   - The sync engine batches pending ops and POSTs them to `/api/sync`.
   - Backend applies ops idempotently (skips already-applied by `sync_ops`).
   - Mobile marks applied/skipped ops as processed and removes them from outbox.

3. **Read path**
   - Mobile reads from SQLite for instant UI.
   - `GET /api/habits` and `GET /api/checkins/:date` provide server state when syncing (e.g. fetching remote habits to merge).

## Auth

- **JWT**: Email/password login returns a JWT. All API calls use `Authorization: Bearer <token>`.
- **OAuth exchange** (public): `POST /api/auth/oauth/exchange` — exchanges Google/Apple id_token for app JWT. Creates user or links to existing by email.
- **OAuth link** (auth required): `POST /api/auth/oauth/link` — links a new provider to the current user.
- **OAuth unlink**: `DELETE /api/auth/oauth/unlink/:provider` — removes provider; blocks if it would leave user with no login method.

## Push

- **Registration**: Mobile requests notification permission, gets Expo push token, `POST /api/push/register`.
- **Preferences**: `PUT /api/push/preferences` stores `enabled`, `timeLocal`, `timezone`.
- **Send test**: `POST /api/push/send-test` sends a test notification to the user’s registered tokens.
