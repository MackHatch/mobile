# Demo GIF Recording Plan

Record a short GIF for the 2-minute demo showcase.

## Prerequisites

1. `make demo` (or `npm run db:up` + `npm run db:migrate` + `npm run db:seed` + backend running)
2. Mobile app running (`cd apps/mobile && npm start`, then `i` for iOS)
3. Sign in as demo user: `demo@pulse.com` / `DemoPass123!`

## Script (30–45 seconds)

1. **Today toggle** (5–10 s)
   - Open app on Today screen (already there after login).
   - Tap a habit to complete it (checkmark animates).
   - Tap mood 1–5 (e.g. 4).

2. **Share card** (10–15 s)
   - Tap "Share" next to a habit.
   - Streak card appears.
   - Optionally use Share or Close.

3. **Deep link** (5–10 s)
   - Settings → Demo → Open deep link (today).
   - App opens Today via `pulse://today?date=YYYY-MM-DD`.
   - Or: Open habit deep link → habit detail screen.

## Recording Tips

- iOS Simulator or physical device.
- 10–15 fps is enough for smooth playback.
- Tools: QuickTime (Mac screen record), LICEcap, or `ffmpeg` screen capture.
- Crop to device frame for a polished look.
