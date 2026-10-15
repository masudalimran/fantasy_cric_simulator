# Fantasy Cric Sim: project context

A personal, non-commercial cricket simulator with anime and video-game character teams (20 built-in teams, T20 and ODI, season calendars, a Career mode). Built for fun with friends; the owner relies on Claude to design and build it. Career mode is the heart of the game, and the goal is to feel as close to a real game as possible.

## Stack and layout
- Vite + React 19 + TypeScript, Tailwind v4, zustand (persisted to localStorage key `fcs.v1`), react-router, framer-motion. Deployed on Netlify from `main`.
- `src/engine/`: pure, seeded, deterministic match engine (no React or DOM). Live matches are replayed from seed + actions. Calibrated against Cricsheet data (`scripts/baselines.mjs`, `scripts/calibrate.ts`).
- `src/season/`: season, market, coaching, injuries, progression, review, recap logic (also plain TypeScript, no React). The owner may one day rebuild as a native app, so keep both folders UI-free.
- `src/data/`: teams (`teams/index.ts` has the strength `TIER`s, tuned by simulation), youth pool, origin (`origin.ts`: which anime or game a player is from), image manifest. Every built-in player needs a portrait in `imageManifest.json` (a test enforces it).
- `src/components/match/`: the live match screens (Stage, animation screens, ControlDeck, MatchPreview). `src/pages/`: one file per page.
- Tests: `npx vitest run`. Type-check: `npx tsc -b`. Build: `npm run build`.

## How to work here
- **README.md must be updated in the same change as every feature or rule change.**
- Do not push unless asked ("push"). The dev server must be closed at the end of every task unless told to leave it running.
- Existing careers must keep working: derive new things from saved data on the fly, make new saved fields optional, never require a migration.
- Never change game balance without being asked. Anything visual (field sets, pitch tint, animations) must not touch results; changes to the engine are checked by simulation.
- The app is used almost entirely on **phones** (a PWA). Design phone-first. The PC layout is kept working but is no longer designed for. The UI should have breathing room: prefer folding secondary controls away over showing everything at once.
- **Netlify free tier**: keep requests and downloads to a minimum (no new audio or large asset files, no server calls). Saves live in the browser.
- Explain things in plain words, not engineering jargon.

## UI and wording rules
- Say "Batsman", never "Batter". A session is called a "Career" in all UI text.
- Buttons show a pointer cursor; buttons in a row are the same size with the same border. Mobile screens must not squeeze text (use one-line pills or sideways arrows).
- Every page needs a real URL path. Squad/XI/order lives on the Squad page, not the Edit-team page.
- Confirm before anything costs coins or is hard to undo. "Sim" means simulate one game; "Skip" means move time forward. The one main action on a screen glows.
- Images come from the owner pasting URLs or dropping files; never bypass bot protection (Fandom/Cloudflare).
- Add click-through backlinks wherever a match, player or team is shown (`PlayerAvatar` with `profile`, `DetailsProvider`).

## Key design decisions
- Career = one managed team (`Season.myTeamId`), the CPU runs the rest; difficulty is fixed at the start. Every finished year is kept in `SessionFile.history`; the year summary in `SessionFile.reviews`.
- Player market (`season/market.ts`): two windows a year, youth pool from `src/data/youth.json`, squad cap 20 / floor 13, release pays 70% of the team ask. Coaching and injuries/physios exist and are wanted (watch whether friends find injuries frustrating; soften rather than remove).
- Animation screens: one pause rule. Where auto-play pauses (wickets, fifties and hundreds, boundaries, innings end), that event's screen waits for a tap; every other screen closes by itself. Animation level Full / Light / Off.
- The field view changes by stage of the game (`fieldSets.ts`), scenery only. Every match already has a hidden pitch (`engine/pitchInfo.ts` puts it into words and tints the field).

## Backlog (agreed, not planned yet)
Achievements and goals; commentary voice (the phone's built-in voice, or pre-recorded clips, costs downloads, so parked); Hall of Fame / retirement; commentary line variety; difficulty-scaled purses.
