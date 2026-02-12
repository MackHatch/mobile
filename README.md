# Pulse — Habit & Mood Tracker

Offline-first mobile app for tracking daily habits and mood, with streaks, insights, and push reminders.

## Features

- **Offline-first** — SQLite + outbox sync; works without connectivity
- **Sync** — Batched ops (habit.create, completion.set, mood.set) to Postgres
- **OAuth** — Google/Apple sign-in; account linking for email users
- **Push** — Expo push tokens, reminder preferences, send-test
- **Share** — Streak card image with deep link
- **Deep links** — `pulse://today?date=...`, `pulse://habits/:id`, `pulse://share/habit/:id`

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (Postgres + Redis)

### 1. Install

```bash
npm install
```

### 2. Start database

```bash
npm run db:up
```

### 3. Migrate

```bash
npm run db:migrate
```

### 4. Environment

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
# Set JWT_SECRET in apps/backend/.env
```

### 5. Run dev

```bash
npm run dev
```

- **Backend:** http://localhost:4000
- **Swagger:** http://localhost:4000/docs
- **Mobile:** Expo dev server (scan QR or `npm run dev:mobile` then `i`/`a`)

## Demo Script (2 minutes)

1. **Onboarding** — Sign up; complete 3 steps (welcome, pick habits, reminders)
2. **Today** — Toggle a habit, set mood 1–5
3. **Habits** — Add habit, tap to view detail, Share streak
4. **Insights** — View completion %, avg mood, best streak
5. **Settings** — Account linking, push toggle, Demo (dev) for quick deep links

**Dev shortcut:** Settings → Demo → Open today deep link / Trigger share card / Send test push

## URLs & Ports

| Service | URL | Port |
|---------|-----|------|
| Backend | http://localhost:4000 | 4000 |
| Swagger | http://localhost:4000/docs | — |
| Postgres | localhost:5432 | 5432 |
| Redis | localhost:6379 | 6379 |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Backend + mobile concurrently |
| `npm run db:up` | Docker compose up (Postgres, Redis) |
| `npm run db:down` | Docker compose down -v |
| `npm run db:migrate` | Prisma migrate |
| `npm run test:smoke` | Backend integration smoke test |
| `npm run detox:build:ios` | Prebuild + build iOS app for Detox (macOS) |
| `npm run detox:test:ios` | Run Detox E2E tests on iOS Simulator |

## Smoke Test

With backend running:

```bash
npm run test:smoke
```

Runs: register, login, create habit, sync (habit.create + completion.set + mood.set), fetch checkin, assert.

## Detox E2E (iOS Simulator)

End-to-end tests run on the iOS Simulator using Detox. Requires **macOS, Xcode, and the iOS Simulator** (not supported on Windows).

### Prerequisites

- Mac with Xcode installed
- iOS Simulator (iPhone 16, iOS 18.1 recommended; adjust `.detoxrc.js` if using a different sim)
- Backend running at `http://localhost:4000`
- Demo user exists. Create once:

```bash
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"email":"demo@test.local","password":"Demo123!"}'
```

If the simulator cannot reach `localhost`, set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:4000` and rebuild.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run prebuild:ios` | Expo prebuild with detox variant (generates `ios/`) |
| `npm run detox:build:ios` | Prebuild + xcodebuild for simulator |
| `npm run detox:test:ios` | Run Detox E2E tests |
| `npm run detox:clean` | Remove `apps/mobile/ios` |

### Flow

1. `npm run detox:build:ios` — one-time or after native changes
2. `npm run detox:test:ios` — run tests (launch app → login → onboarding → Today → toggle habit → assert done)

## Architecture

See [docs/architecture.md](docs/architecture.md) for data flow, auth, and push.

## Screenshots

See [docs/screenshots/README.md](docs/screenshots/README.md) for portfolio capture checklist.
