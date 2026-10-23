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
- **Broadcast view is the default field view** (`BroadcastView.tsx`, `broadcast.ts`, `broadcastDraw.ts`): a TV camera behind the bowler that follows the ball, cuts to a reverse camera, and acts out every kind of ball (run outs with the throw, stumpings, wides, byes, leg byes, no balls, umpire signals, batsmen running). The top-down field stays as a choice in Controls (the saved choice is kept in the browser). It is **drawing only**: it reads the ball the engine has already played and must never touch a result. The animation screens for a ball, and auto-play, wait for its clip to end (`clipNow`). Keep it light on phones (one canvas, DOM cut-outs for people).
- **Stadium character** (`engine/stadium.ts`, scenery only): the home team's ground has its own stands, boards and crowd colours; T20s are mostly under lights, one-day games by day or evening, Tests by day; a Test shows the weather the engine really planned (rain, covers on a washed-out day); limited-overs games show at most a drizzle.
- **Ball speed** (`engine/speed.ts`) is for show only (the engine never reads it): speed gun, commentary list, stump cam, studio card. 145 km/h and up is a fireball, under 80 a snowball.
- **Voices** (`audio/voice.ts`, `audio/speechText.ts`, `season/liveVoice.ts`, `data/gender.ts`): the studio show and the live commentary are spoken with the phone's built-in voices (no audio files, no server calls, so the Netlify rule holds). Default is Studio mode. A browser has no real speech permission, so the game asks first ("Let the game talk?") and treats a refusal, "No thanks" or a phone that will not speak as off; turning it on again asks the same way. Men speak in male voices and women in female voices (the women are listed by id in `data/gender.ts`; add new female characters there). The commentators never say the ball speed aloud.
- The studio show is a recap of the innings just played (first innings at the break, the last one after the match): batsmen top to bottom, then bowlers; `season/grade.ts` sets Poor to Exceptional; quiet performances are grouped into one short line; a very good or very bad game gets a form guide (this season and earlier years).
- **The pitch has a toss edge, and it is a deliberate balance change**: ±20% in the first innings and ∓10% in the second, from `pitchLean` (not in Tests or super overs). It is mean-neutral (symmetric) and checked by `scripts/pitchsim.ts`; the computer reads the pitch when it wins the toss. Do not remove or retune it without being asked. The pitch report screen shows the same advice.
- The field view from above changes by stage of the game (`fieldSets.ts`), scenery only. Every match already has a hidden pitch (`engine/pitchInfo.ts` puts it into words and tints the field).
- **Page smoke tests are missing**: unit tests run without a browser, so a crash in a screen (the Controls black screen) can slip through. Open the match page and Controls by hand after changing them.

## Backlog (agreed, not planned yet)
Achievements and goals; Hall of Fame / retirement; commentary line variety; difficulty-scaled purses; an automated page smoke test; instant replay in the broadcast view; ball-speed records (fastest ball of the season); subtitles for the commentary; a lighter broadcast quality setting for slow phones.
