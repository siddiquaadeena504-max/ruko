# Ruko — a calm voice when fear takes over

**Pause. Breathe. Verify.**

Ruko helps elderly people in India get through digital arrest and impersonation scam calls. When a caller claims to be from the CBI or police, threatens a "digital arrest" or demands money, the person presses one big button and says what happened in their own language. Ruko asks 2–3 simple questions, checks the answers against known scam patterns, explains what it found, alerts trusted family (only with consent), and points them to safety: hang up, call family, call 1930.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # scam-engine tests (Node ≥ 22.6)
npm run build && npm start
```

You don't need any API keys. Without them Ruko runs in **demo notification mode**: alerts show up in the family dashboard and in a demo outbox, and every screen says plainly that **no real message was sent**.

### Try it

| What | Where |
| --- | --- |
| Scripted demo (CBI officer, Aadhaar drug parcel, digital arrest, money, video call, secrecy) | Home → **Try a demo**, or `/help?demo=1` |
| Elder onboarding | `/welcome` |
| Family dashboard with sample data | `/family` → **Explore with sample data** |
| Pair a real household | Elder: Settings → *Connect family dashboard* → 6-digit code. Family: dashboard → enter the code |

## Architecture

```
src/
  app/                      Next.js App Router pages + API routes
    page.tsx                Elder home (the big I NEED HELP button)
    welcome/                Onboarding: language, name, mic, contacts, consent
    help/                   Voice assistant session (also ?demo=1)
    settings/  privacy/     Settings, data deletion, privacy policy
    family/                 Family dashboard (auth, alerts, history, contacts, prefs, learn)
    ack/[token]/            SMS acknowledgement link (no account needed)
    api/                    household, contacts, pairing, sessions, alerts, auth, family
  lib/
    scam/                   Rules-based engine — pure TS, runs on the device
      indicators.ts         Patterns + multilingual phrases (add new patterns here)
      engine.ts             detect → choose questions → assess (never returns "safe")
    i18n/                   7 languages: en, hi, ta, te, kn, ml, bn
    client/                 Device token, household context, Web Speech STT/TTS, demo script
    server/
      db.ts                 JSON-file store, atomic writes, serialised queue (swap for Postgres)
      crypto.ts             AES-256-GCM field encryption, scrypt passwords, HMAC lookups
      auth.ts               Family cookie sessions + elder device bearer token
      alerts.ts             Alert creation, priority order, lazy escalation, acknowledgement
      notify/               NotificationProvider: Twilio SMS (live) or Mock (clearly labelled)
```

**Speech.** Speech-to-text and text-to-speech use the browser's Web Speech API with `xx-IN` locales. `useSpeechRecognition` in `lib/client/speech.ts` is the seam where a server-side STT provider (such as Bhashini) would plug in. If voice isn't available or the microphone is blocked, every step still works with large Yes / No / Not sure buttons. Nobody ever has to type.

**Escalation.** If the current contact hasn't acknowledged within the household's escalation delay (1–10 minutes, set in the family dashboard), the next contact is alerted. A failed send moves on straight away. Escalation is evaluated whenever an alert is read (the elder's screen and the dashboard both poll), so no background worker is needed. In production, add a cron job that hits the same function.

## Safety and privacy guarantees (as implemented)

- The microphone is used only during a help session the person started. Ruko never records calls or listens in the background.
- Transcripts are assessed on the device and **never sent to or stored on the server**. Sessions store only the date, the risk level and the indicator IDs.
- Ruko never asks for Aadhaar, OTP, PIN or bank details, and never stores them.
- Contact names, phone numbers and family emails are encrypted at rest (AES-256-GCM). Passwords use scrypt.
- Alerts follow the elder's consent setting: *ask each time* (the default), *automatic*, or *never*.
- An alert is never reported as sent when it wasn't. With Twilio, "sent" means accepted by the provider, not delivered.
- The engine never labels a call safe. The lowest result is "I can't be sure this call is safe — verify independently."
- Ruko never talks to the caller or controls the phone. Calls go through ordinary `tel:` links.
- Ruko does **not** detect phone calls automatically and does not send silent alerts.

## Configuration

Copy `.env.example` to `.env.local`:

- `RUKO_ENCRYPTION_KEY`: 64 hex characters. Required in production. In development, a key is generated in `.data/secret.key`.
- `RUKO_PUBLIC_URL`: base URL for acknowledgement links in SMS.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`: turn on real SMS alerts.

## Known limitations

- Translations outside English were written for this prototype and **need review by native speakers**. Onboarding, settings and the family dashboard are in English. The elder-facing help flow is in all seven languages.
- Web Speech recognition is best in Chrome/Edge (Android and desktop). Firefox has no speech recognition, so it falls back to buttons.
- The JSON-file database suits a single server. Use Postgres for multi-instance deployments.
- Keyword matching is a heuristic. It recognises known patterns only and cannot guarantee detection.
