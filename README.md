# Fantasy Cric Sim

A personal, non-commercial cricket simulator. Teams come from anime and video games, matches are simulated with a
ball-by-ball engine calibrated to real T20 and ODI data, and a **Career** mode lets you manage one team through
year after year of tournaments, like a career mode in a football game.

Everything runs in the browser. There is no server: your teams, careers and settings are saved in this browser's
local storage, and the **Backup & transfer** page exports and imports them as a file.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npx vitest run   # unit tests
```

Deployed on Netlify (`netlify.toml` sets the build and the single-page-app redirect, so every address works on refresh).

---

## What is in the app

### Teams
- 20 built-in fantasy teams (Bleach, Naruto, Dragon Ball, JoJo, Yu-Gi-Oh!, The Seven Deadly Sins, InuYasha, The Witcher,
  Final Fantasy and more), 15 to 20 players each. Every built-in team has a portrait for every player, saved in `public/images/players` (a test checks it). To ship portraits you pasted as URLs, export "Current teams only" from the Backup page and run `node scripts/bake-image-urls.mjs <that file>`. The Zelda, Mass
  Effect, Overwatch and Halo teams were retired because some portraits could not be found (`LEGACY_TEAMS`): they are no
  longer offered, but a saved career that already uses one keeps it. You can edit any team or player (changes are saved
  here, with a confirmed "Reset to default") or create your own team. Images are pasted as URLs; team logos and player
  portraits fall back to initials.
- **Team strength tiers** (`TIER` in `src/data/teams/index.ts`): Universe 7 Warriors, Grand Line Pirates and Assassin
  Brotherhood are the top tier (they win about 85% of their matches against the whole field), Hidden Leaf Shinobi,
  Demon Slayer Corps and Soul Reapers the middle, and the rest run from decent (about 60%) down to weak (under 20%).
  The numbers were tuned by simulating every team against every other, since a few rating points is a lot in this
  engine. The ratings are written once and shifted per team to hit the tier; a team you saved with edits keeps your
  edited players and gets the tier ratings for everyone you did not edit.
- **Squad** page: drag one player onto another to swap, pick the captain (C) and the wicketkeeper (WK). Saving without
  a keeper or captain in the XI asks you to choose.
- **Import stats from a season** (Teams page): copies the ratings a career season ended with onto the teams
  themselves, after showing a preview and asking for confirmation.
- **Hide player images** (button beside the sound icon in the top bar): shows initials instead of pictures everywhere.

### Play (friendlies)
If a career is open, the Play page ends with a big **Continue career** button.
Pick any two teams and a format (T20 or ODI). You control both sides. Before the toss you see both **team sheets** (the
XI in batting order, captain and keeper, ratings, the bench, and for a computer team who came in or dropped out and
why). The sheets fill exactly one desktop screen, so there is nothing to scroll. The coin sits in a bar along the bottom: tap it, it spins, and the toss winner chooses to bat or bowl. Before the coin is flipped you can **Edit squad**: in a
career only your own team (kept for the rest of the career), in a friendly both sides (this match only). Anyone you bring in is marked **IN** and anyone you take out appears
on two fixed lines, a green **IN** line and a red **OUT** line (each says "no changes" when nobody moved, so both sheets stay the same size) (the computer's changes show the same way, with the reason). IN and OUT are measured against the XI that team played in its **last match**, not the original team. The editor
shows every player's rating and how far the career has moved it. You can cancel until the coin
is flipped; after that there is no way out (remembered across a refresh). Matches in progress are saved, so refreshing or leaving brings you
back to the same ball (the match is replayed from its seed and your actions).

### Career (the main mode)
A career is a save file. `/career` lists your saves; inside one you get these pages:
- **Calendar**: the whole year's fixtures. Today is a blue circle and a TODAY tag; days with your match say ★ YOUR MATCH. Sim buttons stop at your next match.
- **Tournaments**: an **All** view (every team's record across all tournaments, latest results with a *Show all*
  page, coming up) and a page per tournament with standings, form, playoffs, leaders and matches.
- **Stats**: batting, bowling, awards, **Rating** (every player's current overall and individual ratings, sorted by overall;
  click a heading to sort by that rating; searchable; a green +n or red −n beside each rating shows its
  movement since the player started, but sorting is always by the current value), teams and records, with sortable columns. Records name the match and player.
- **My squad**: your XI and batting order for this career only (the team itself is untouched), plus a
  **Rating changes** table.
- **Season review**: how the year went, and then *Start the next season*.
- **Team page** (click any team inside a career): the squad it is using right now and every match it played this
  season, bordered green (won), red (lost) or yellow (not played yet).
- **Year selector** on Tournaments, Stats and team pages: every finished season is kept in full, so you can look back
  at any past year (read-only).

Rules of a career:
- You choose one team and a **difficulty** (Easy, Normal, Hard, Legend) when it starts. Easy and Normal help your own
  team (`help`: +8 and +5 rating points in matches) and Easy also weakens the computer; Hard has no help; Legend
  strengthens the computer (`DIFFICULTIES` in `engine/types.ts`); it can't change later and is
  shown throughout. The computer runs every other team, including batting plans, bowling changes, its XI (it drops
  injured or out-of-form players, with "Team news" shown at the toss) and batting-order calls during a match.
- **Matches are played in order.** Nothing after one of your waiting matches can be started, and every earlier
  match is played out first. A played match is final: no replay, no rematch. Once the coin has been
  flipped a career match can't be cancelled or discarded (only finished or forfeited), the calendar offers only
  *Resume* for it, and it can't be simmed.
- Teams in a career are fixed when it starts; a team created later can't join.
- Seasons run strictly year to year.
- A career can't be duplicated (that would allow save-scumming).

### Standings
A win is worth 2 points and a tie 1. Every table (a tournament's league or group table, a series, and the team tables on
Tournaments > All and Stats > Teams) is sorted by points, and teams level on points are split by **net run rate**
(NRR). In the Titles column, click a number to see which tournaments those titles were (`TitlesButton`); teams with none show a grey 0. Computed in `tableFor` (`season/results.ts`) and `teamRecords` (`season/stats.ts`).

### The player market (Career > Market)
Two windows a year (the **Season auction**, 1 to 14 January, and the **Mid-year window**, 1 to 14 July) when players can
be bought, sold and released. The windows are marked on the calendar (a purple ring, OPENS and CLOSES tags, and a banner
that links to the market) and on the Home page.
- **Unsigned players**: each year 40 young anime characters (drawn from a pool of about 270 in `src/data/youth.json`,
  each with an image; built by `scripts/fetch-youth.ts` from `scripts/youth-candidates.txt`) are on offer, plus anyone
  who has been released. They are cheap but have a hidden **potential**, shown as stars; at the end of every year they
  grow towards it (`developYouth`), so a star prospect is worth waiting for.
- **Other teams**: you can buy from any computer team. They ask more than a player is worth, a lot more for their top
  five, and will not sell below 13 players.
- **Prices** (`marketValue` in `season/market.ts`) climb steeply with overall rating, recent form (from the per-match
  rating changes) and potential. Every team has a purse (60 coins to start, +40 a year and +10 per title).
- **Market opens show** (`MarketOpens`): when a window opens (at the start of a career, and every window after) the
  Calendar plays a short animation, coins raining and **OPEN!** slamming in, with your coins, squad size, the closing date
  and a **Go to the market** button. It plays once per window per career.
- **Confirm first**: Cost (buy or sign), Release and Accept (an offer) never act straight away. They open a card with the
  player's ratings, traits, his numbers so far, recent matches and career path, and what it does to your coins; only
  the green button does it (`MarketConfirm`). **Latest moves** shows each player's face (tap for his profile) and team
  crests that link to the team pages.
- **Squad cap of 20**: a full squad has to release someone (they go back to the unsigned pool and the team gets a
  70% of what another team would charge for them) before signing. A squad never goes below 13.
- **The computer shops too**: each window day every computer team may sign one player (the harder the difficulty the
  busier they are, `BUSY`), buying whoever improves their side most and releasing the weakest if they are full. If you wait
  too long, the player you wanted is gone. Your own team is never touched.
- **Offers for your players**: while a window is open, computer teams sometimes bid for one of your players (fair price, a lot
  more for your best five, never when you are at the minimum squad). Offers are listed at the top of the Market page
  (the tab shows a dot) for five days: **Accept** sells him and you get the coins, **Decline** turns it down. If the buyer
  is full they release their weakest player.
- **Which team he played for**: after a move, each row in his Recent matches shows the team he played for that day, and
  the opponent is worked out from that, not from his current team.
- **Signing animation** (`SigningOverlay`): the player's portrait lands between his old team (or "Free agent") and the
  new one, with his ratings. In matches a new signing's introduction says where he came from and what he cost, and his
  player card has a **Career path** (every move he has made).
- Where it lives: the market is part of the season (`season.market`, `season.windows`), squads are applied in
  `sessionTeam`, the computer's shopping runs as the date moves through a window (`advanceMarket`, called from the store),
  and old careers get a market the first time they are opened (`ensureMarket`).

### The computer's team selection
Computer teams change their XI more often: form drops and recalls players, and in matches that matter little (friendly
series, and sometimes league games) they rest a few regulars and give the reserves who have played least a chance,
keeping five bowlers and a keeper. The team news says "rested" and "given a chance". Knockouts always get the best side.

### Ratings change as you play
After every match each player who batted or bowled is graded against what a player of his rating normally does in
that format. Beat it and a rating goes up by 1 or 2; fall well short and it goes down (a duck always costs a
point). Stars drift back toward the middle, and no rating moves more than 15 from where it started. The new ratings
are used from the next match on, for everyone, and **they carry across seasons**.

A career that was already under way when this arrived is caught up the first time you open it: the matches already
played are graded in date order from their saved batting and bowling lines (`gradePlayedMatches`), so those players
get their changes too. New careers start already caught up (`season.graded`).

You can see it everywhere:
- every player popup (profile, the in-match player card, the toss screen's sheets) shows each rating as `start → now +n` (green) or `-n` (red), the overall change, and what
  each recent match did;
- My squad shows every rating from its starting value to now, plus the last match's change;
- the match result lists how the match moved your players, and the match popup shows each player's change.

### The match screen
- A field with batsman, non-striker, bowler and fielders, a scoreboard with projected score, scorecard,
  commentary and a Stats tab (overview, wagon wheel, charts, partnerships, phases, overs, matchups, win chance).
- **Aim your shot / line, length and pace** (Controls panel, two folded sections, shown only for the side(s) you run):
  - *Batting*: tap a part of the field on the wheel (Straight, Cover, Point, Third man, Behind, Fine leg, Square leg,
    Midwicket) and choose Ground or In the air, **or just drag across the field** (a short drag stays on the ground, a
    long one lifts it; a checkbox turns dragging off). An amber arrow shows the lined-up shot.
  - *Bowling*: tap a spot on the little pitch (line from down the leg side to wide of off, length from short to yorker)
    and pick Fast / Medium / Slower ball (Quicker / Normal / Flighted for spinners). A red dot shows where it will pitch.
  - Each choice is for the **next ball only**; with nothing chosen the ball is simulated exactly as before. The ball
    follows what you chose (it pitches where you put it and the shot goes where you aimed), the wagon wheel and the
    commentary show it. `engine/aim.ts` holds the maths: gaps in the field score more, playing across the line is
    risky, lofted shots give sixes and catches, yorkers are hard to hit but a miss is a full toss, and bowling the
    same line and length twice lets the batsman read it. A random mix of choices plays out about like the plain sim,
    so nothing is a free win (tests check this). Actions: `shot`, `delivery` in the replay log.
- **How to bowl**: when you bowl, the Controls panel offers **Safe**, **Normal** or **Aggressive**. Safe bowls to the
  fielders (fewer wickets, fewer boundaries); Aggressive tempts the big shot (more wickets, more boundaries). It is an
  action (`style`) in the replay log, and `bowlStyle` on the match.
- **Innings break**: the next innings never starts by itself. The screen stays on the finished innings (scoreboard, scorecard,
  commentary) while the big Next ball button becomes **Next innings** (also on a small card with the target); nothing
  plays until you press it.
- **Controls** (the round buttons, bottom right): next ball, auto-play, and a panel with finish over, sim N overs,
  next wicket, end innings, finish match, batting plan, bowler choice and forfeit.
- **Auto-play** pauses where you tick it: wickets, boundaries, end of an innings. With the wicket pause off, introductions are half as long.
- **Run rate** chart (Stats > Charts): the running rate after each over for both innings, with the chase's required rate.
- **TV-style moments** take over the field for a few seconds: a wicket (it stays up until you resume, play, or click
  it when "pause on wickets" is on), fifties and hundreds, and the first time a batsman or bowler gets going
  (his season stats, or his ratings in a friendly). Introductions stay up long enough to read (12 seconds at normal speed,
  less at 2x and 4x) with a bar showing the time left; click anywhere on one to move on at once.
- Click a player's portrait for the player card (ratings with their career changes, his overall stats for the season and
  the whole career, and what he has done in this match). In every player popup the numbers are split into **Batting** and **Bowling** blocks (with the matches line above them).
  **Matches** counts every match he was in the XI for; **Bat apps** and **Bowl apps** count only the matches in which he
  batted or bowled, and averages, strike rate and economy are worked out from those. (Matches record both XIs from now
  on; older saves only know about players who batted or bowled.) His overall stats include the match in progress, so runs and wickets show up
  the moment they happen; the innings break, the Man of the Match ceremony and the win
  screen (confetti) follow the match.
- Sounds are synthesized (crowd, wicket "aww", cheers); the volume button toggles them.

### Explanations
Hover any table heading or rating name (Technique, Power, Temperament, Running, Accuracy, Variation, Stamina, Fielding,
and stats like Avg, SR, Econ, NRR) and a tooltip explains it in plain words. The wording lives in
`src/data/glossary.ts`; a table heading is picked up automatically, anything else needs `data-gloss="Name"`.

### Click-through everywhere (inside a career)
In every match row the winner's crest has a gold ring and a W badge; the loser's is dimmed.

A finished match opens a popup (Match summary first, then Scorecards, teams in batting order with the opposition's
bowling against them). A player's portrait or name opens his profile. A team name goes to the team page. When you add
a screen that mentions a match, player or team, link it the same way.

---

## Easy for beginners

The app is built so someone who has never seen it can follow the shiny things:
- **Home** (`/`, `pages/HomePage.tsx`): one big glowing button that always says the next step: start a career, play your
  next match, carry on with a live match, see the season review, or skip ahead. Below it are a few quiet tiles
  (Calendar, Quick match, Teams, How to play). Before any career exists it shows a three-step strip.
- **How to play** (`components/HowToPlay.tsx`): a picture-led six-step sheet opened by the **?** button on the desktop bar,
  the Home tile or the phone's More sheet. It can also bring the first-time tips back.
- **First-time tips** (`components/TipBanner.tsx`, state in `src/tips.ts`, saved as `fcs.tips`): a small floating card
  with a **Got it** button on the Calendar, the toss and the match screen. Each shows once.
- **The glow**: `.cta-pulse` (green) and `.cta-pulse-gold` in `index.css` mark the one thing to press: Start career,
  your next match's Play button, NEXT BALL (not while auto-play runs), and Got it. It stops for people who prefer reduced motion.
- **Skip to my next match** (Calendar, the big gold button): if other teams' matches are waiting before yours, a popup
  lists them, each with **Watch** (play it yourself) and **Sim** (simulate it, just the result), plus **Sim all** at the top.
  When none are left it turns into "It's match day!" with a glowing **Play match** button. **Skip to next match day**
  is the second most important button (indigo, full width on a phone). It moves the date to the next match day and opens
  the same popup for that day's games, with **Watch** and **Sim** on each and a **Sim all** button. **Skip a week** and
  **Skip 30 days** move the date to the first match day on the way (or to the end if there is none) and ask the same
  way. Nothing is simulated without you choosing, and closing the popup leaves the date on that match day.
- **After a match** a glowing **Play my next match** button opens the same popup (`components/season/BeforeYours.tsx`)
  when other teams' matches are waiting, and otherwise goes straight to the next toss (or "See my season review" at the end of the year).
- **Plain words**: "Sim" is now **Skip** (it plays the other teams' matches and always stops before yours), with a line
  of explanation under the Calendar buttons.
- **New career** asks only for a team (with a **Pick one for me** button); difficulty, name, year and the teams in the
  competition are folded under "Change the rules" with sensible defaults.

## On a phone

The app is built to feel like a native app on a phone (the desktop layout is unchanged):

- **Installable (PWA)**: `public/manifest.webmanifest`, icons in `public/icons`, and a small service worker
  (`public/sw.js`, registered only in the built app) so it opens instantly and works offline after the first visit.
  Android/Chrome offer a real install prompt; on an iPhone use Share, then Add to Home Screen. The **More** sheet
  explains it. `index.html` sets the theme colour, safe-area handling (`viewport-fit=cover`) and the iOS app meta tags.
- **Shell**: a slim top bar and a bottom tab bar (Home, Teams, a big Play button, Career, More). The More sheet holds Backup,
  Sound, Player images and Install. While a match is on, both bars go away: the match is a full-screen game.
- **The match screen** is its own layout on a phone: compact scoreboard with a back button, the field, batsman, non-striker
  and bowler cells, the over and partnership line, then a scrolling Scorecard / Commentary / Stats panel, and a thumb bar
  at the bottom (controls, a big NEXT BALL, auto-play). Wickets, boundaries and milestones buzz on phones that support
  it. Held sideways, the field fills the left and everything else sits beside it. Introductions and big moments stack
  portrait-over-text and say "Tap to continue".
- **Toss screen**: the two team sheets are tabs; the coin sits in a bar at the bottom, in thumb reach.
- **Popups are bottom sheets** (`components/Sheet.tsx`): they slide up, have a grab handle, and drag down to dismiss.
  On a computer the same component is a centred card.
- **Career pages**: a compact header with a sticky tab strip moved with ‹ › arrows, not by swiping, with **Calendar in gold** (on desktop too) so it is easy to find (tabs keep their full names and the open one is kept in view), a calendar of dots (tap a day for a sheet of its matches),
  tables with a sticky first column, and a team chooser sheet on the Play page.
- Layout helpers: `useIsMobile` / `useIsLandscapePhone` in `src/hooks.ts`, safe-area variables (`--sat`, `--sab`) in
  `index.css`, and `max-md:` classes. Anything phone-specific is behind these so the desktop view stays as it was.
- On a phone the root font size is 14px (browser default 16px on a computer), so every rem-based size and gap is about
  12% tighter; the match screen's big numbers are smaller again on top of that.
- Buttons are trimmed on a phone too: they get a smaller spacing unit (`--spacing: 0.19rem` in `index.css`), so their
  padding, gaps and heights are about a quarter tighter, with a 32px minimum height for touch.
- **Screen stays on**: the app asks the phone not to dim or lock while it is open (Screen Wake Lock, `useWakeLock` in
  `hooks.ts`). It needs https (the Netlify site, or an installed app), so it does nothing on `http://192.168…` in dev.
  The More sheet has a **Keep screen on** switch (on by default, `fcs.keepAwake`).
- Test it on a real phone with `npm run dev -- --host` (same Wi-Fi) or the Netlify deploy.

## How it works

- **Stack**: Vite, React 19, TypeScript, Tailwind v4, Zustand (persisted), React Router, Framer Motion, Recharts,
  canvas-confetti. No `enum`s or parameter properties (`erasableSyntaxOnly`).
- **Engine** (`src/engine`): a pure, seeded ball model. Baseline outcome probabilities per format and phase come from
  Cricsheet data and are scaled by ratings, batting intent, how settled a batsman is, pitch and "form of the day".
  A match is fully determined by its seed, squads and the list of actions taken, which is how resume works. Calibrated
  to about 172 (T20) and 266 (ODI) first-innings runs.
- **Season** (`src/season`): fixture generation (balanced tournaments founded by teams, friendly series fill the
  gaps), results, standings, stats, records, the computer's squad selection (`selection.ts`), rating changes
  (`progression.ts`) and the season review.
- **Store** (`src/store`): `fcs.v1` in local storage holds custom teams, team edits, careers, the live match.
  A career keeps its current `season` and every finished season in `history`. Rating changes live in the season's
  `shifts` (cumulative, per rating) and are applied on top of the base team whenever a match is played or shown; the
  simulator is given the base teams and applies each match's current ratings itself.
- **Backup & transfer** exports either **Everything** (teams, careers with results and ratings, a match in progress) or
  **Current teams only** (the teams you created and your edits to built-in ones; named `fantasy-cric-sim-teams-…`). A
  teams-only file imports like any backup.
- **Backup**: `BackupFile { app: 'fantasy-cric-sim', version: 1, data }`; import validates, drops anything invalid and
  says what it skipped; "merge" or "replace".
- `scripts/` holds the Cricsheet baseline builder, the calibration run and an image fetcher (not needed to run the app).

## Working notes

- Use "Batsman", never "Batter". Buttons show a pointer cursor and buttons in a row are the same size.
- A "session" in the code is a "Career" in the UI.
- Forfeit: the forfeiting team loses, runs already scored stay, the rest is simulated with bad luck.
- Do not bypass bot protection to fetch images; paste image URLs instead.

## Keeping this file up to date

When you change behaviour or add a feature, add or change the matching line above in the same change. Anything a
future reader would need to know (a rule, a page, where something lives) belongs here.
