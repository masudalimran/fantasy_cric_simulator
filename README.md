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
- 20 built-in fantasy teams (Bleach, Naruto, Dragon Ball, Zelda, Final Fantasy and more), 15 to 20 players each, with
  ratings by popularity. You can edit any team or player (changes are saved here, with a confirmed "Reset to default")
  or create your own team. Images are pasted as URLs; team logos and player portraits fall back to initials.
- **Squad** page: drag one player onto another to swap, pick the captain (C) and the wicketkeeper (WK). Saving without
  a keeper or captain in the XI asks you to choose.
- **Import stats from a season** (Teams page): copies the ratings a career season ended with onto the teams
  themselves, after showing a preview and asking for confirmation.
- **Hide player images** (button beside the sound icon in the top bar): shows initials instead of pictures everywhere.

### Play (friendlies)
Pick any two teams and a format (T20 or ODI). You control both sides. Before the toss you see both **team sheets** (the
XI in batting order, captain and keeper, ratings, the bench, and for a computer team who came in or dropped out and
why). The sheets fill exactly one desktop screen, so there is nothing to scroll. The coin sits in a bar along the bottom: tap it, it spins, and the toss winner chooses to bat or bowl. Before the coin is flipped you can **Edit squad**: in a
career only your own team (kept for the rest of the career), in a friendly both sides (this match only). Anyone you bring in is marked **IN** and anyone you take out appears
on two fixed lines, a green **IN** line and a red **OUT** line (each says "no changes" when nobody moved, so both sheets stay the same size) (the computer's changes show the same way, with the reason). The editor
shows every player's rating and how far the career has moved it. You can cancel until the coin
is flipped; after that there is no way out (remembered across a refresh). Matches in progress are saved, so refreshing or leaving brings you
back to the same ball (the match is replayed from its seed and your actions).

### Career (the main mode)
A career is a save file. `/career` lists your saves; inside one you get these pages:
- **Calendar**: the whole year's fixtures. Sim buttons stop at your next match.
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
- You choose one team and a **difficulty** (Easy, Normal, Hard, Legend) when it starts; it can't change later and is
  shown throughout. The computer runs every other team, including batting plans, bowling changes, its XI (it drops
  injured or out-of-form players, with "Team news" shown at the toss) and batting-order calls during a match.
- **Matches are played in order.** Nothing after one of your waiting matches can be started, and every earlier
  match is played out first. A played match is final: no replay, no rematch. Once the coin has been
  flipped a career match can't be cancelled or discarded (only finished or forfeited), the calendar offers only
  *Resume* for it, and it can't be simmed.
- Teams in a career are fixed when it starts; a team created later can't join.
- Seasons run strictly year to year.
- A career can't be duplicated (that would allow save-scumming).

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
- **Controls** (the round buttons, bottom right): next ball, auto-play, and a panel with finish over, sim N overs,
  next wicket, end innings, finish match, batting plan, bowler choice and forfeit.
- **Auto-play** pauses where you tick it: wickets, boundaries, end of an innings.
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
A finished match opens a popup (Match summary first, then Scorecards, teams in batting order with the opposition's
bowling against them). A player's portrait or name opens his profile. A team name goes to the team page. When you add
a screen that mentions a match, player or team, link it the same way.

---

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
