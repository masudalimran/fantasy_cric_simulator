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
- **Deleting a career** asks you to type `DELETE` (exactly, in capitals) before the Delete career button turns on, because it can't be undone (`ConfirmDialog` has a `typeToConfirm` option for this).
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
- **Schedule on the Calendar**: a box on the Calendar page lists this year's market windows with their dates and whether each
  is open, coming up (in N days) or closed.
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
- **Yearly fees, retirement and the academy** (`season/careers.ts`): one purse only. Every player costs a yearly fee (half
  of what he is worth; it moves with how he improved or faded). When you start the next year (`yearEnd`), each team earns
  income (its wage bill times a multiple from its win rate: 1.5x mostly losing, 2x middling, 3x at 65% wins, 4x at 85%, 5x unbeaten, +0.3x per title, never past 5x; plus your catch-up) and pays its bill. The Market header shows **Budget** and **Wages next yr** (every current player's fee with the raise he is expected to get, a retiring veteran at the extension fee; projectedBill, derived from saved data so older careers show it too), and *How the money works* says what this year's win rate would earn. Computer teams over budget release
  players, then fill their squads from the pool (best prospects first, swapping out their weakest). Because even a team that loses every game earns 1.5x its wages, wages alone never force anyone out; the extension fee for a retiring veteran is the real limit on keeping him. If your purse ever ended below
  zero, the **Contracts** sheet (`ContractsGate`, cannot be dismissed) asks who to let go; fees come back. Every starter has
  a career of 7 to 10 seasons (9 to 12 for players who joined later) and fades in the last two. Computer teams' veterans
  retire; yours are offered one more year at 1.4x the fee (compounding, up to four extensions), or **Let him retire**, and an
  academy graduate of the same role replaces him. Each year about 30+ procedural academy graduates (rating about 40 to 66,
  hidden ceiling 66 to 97, rarely higher) join the pool; all youth grow quickly (each at his own pace), so a graduate can be a
  star in a year or two. Old saves: new fields are optional and derived on the fly.
- **Window closed popup** (`MarketClosed`): the first time you open the Calendar after a window has closed, a card says the
  market is **CLOSED**, with how many transfers happened, how many were yours, the biggest deal, and a **See all transfers**
  button that opens the transfers list for that window. It shows once per window per career.
- **All transfers** (a separate full-width button on the Market page, above the Unsigned / Other teams / My squad chips, not one of them; it changes to "Back to the market" while open): every move made in the career, newest first, filterable by window (Season auction or
  Mid-year window of each year), with a summary line and the same face and team links as everywhere else. Moves that
  involve your team are tinted gold.
- **Offer notice** (`OfferBanner`): while an offer is on the table, a blue notice shows at the top of every career page
  (not on the Market page itself, which lists it): who wants whom and for how much, tap it to go to the Market page. Its cross
  only closes the notice; it does not accept or decline. A new offer brings the notice back.
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

### Coaches
Every team in a career has a coach, picked at random when the career starts from a pool of about 70 characters from
video games that have no team in the game (`src/data/coaches.ts`; coaches have no portraits). A coach has a skill and a
speciality (batting, bowling or fielding).
- **Instruction**: each month a coach works on one thing for the whole squad: **batting** (technique, power, temperament,
  running), **bowling** (accuracy, variation, stamina) or **fielding**. You set it for your team on the **My squad** page by
  tapping the coach card; the computer sets it for every other team from the first day of the career (it reviews it each month, picking the squad's
  weakest area with a nudge towards the coach's speciality).
- **New coaches every year**: when a new season starts (1 January), every team gets a different coach from the pool (never the one
  it had), the instructions start again, the computer's begin at once, and the Calendar opens with **A new coach has appeared**
  and the new coach's name, with a button to set your instruction.
- **It stays for at least a month.** When you pick one the coach says so and tells you the date you can change it again;
  you can keep it going or change it after that. A **Choose again / Set it** step comes first.
- **Prompts**: with no instruction set, the Calendar opens a **Set coaching instruction** card with a button to My squad
  (it comes back the next time you open the Calendar), and playing, watching or simming a match, or skipping days, asks first
  (you can continue without it, and it will ask again).
- **Effect** (`season/coaching.ts`): every day each player in the area gets a little training; it adds up to one whole
  rating point about every month or two (slower at high ratings, faster with a skilled coach or one working in his
  speciality, at most +5 on one rating in a year). Without an instruction nobody trains. Gains go into the career's rating
  changes, so they show up everywhere ratings do.
- **Reports**: the coach sheet (tap the coach on My squad, or on any team's page in the career) shows his skill and style,
  what he is working on, the points he has added this year, and a monthly report of which player got which rating up.
- **Coaches leaderboard**: Stats > Coaches ranks every coach by the rating points he has added to his squad this year
  (and says which coach has boosted his team the most). Tap a row to see his report.

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
- **Play manually** (switch in the Controls panel, remembered; turning it on closes the controls drawer): no auto-play and
  no Next ball anywhere. The dock goes away and the lower panel gets a **Controls** tab with only the aim for the side
  you run: when you bat, the shot wheel (choose Ground or In the air, then tap where to hit it); when you bowl, the pitch
  grid (choose the pace, then tap where it pitches). **Choosing is what plays the ball.** Dragging across the field does the
  same for a shot, and Space does nothing. In a friendly you run both sides, so both pads show. If you are only
  watching, a single Next ball button is all there is. The field and the batsman and bowler cards stay. Switch it off
  (in the same tab) to bring the auto-play options back.
- **Orange Cap and Purple Cap** (`CapsContext`/`CapBadge` in `components/ui.tsx`, computed in `DetailsProvider`): as in the
  IPL, the season's leading run scorer wears the **Orange Cap** and the leading wicket-taker the **Purple Cap** (both caps
  if one player leads both). The cap sits on top of that player's portrait everywhere a portrait is shown inside a career
  (stats, squads, scorecards, popups, the match field), glitters with little twinkling stars and a shine, and follows the
  year you are looking at. Hover it for what it is.
- **Origin tag** (`src/data/origin.ts`, `OriginTag` in `ui.tsx`): every player popup (profile, in-match card, moments, signing and market confirm, market rows, transfers) shows "From <anime or game>". It is derived from the player id on the fly, so running careers get it with no migration, and it follows a player who moves teams. It also covers free agents, released veterans and youth. Custom players show none.
- **Overseas aeroplane** (`isOverseas` in `origin.ts`, `OverseasTag` in `ui.tsx`): a player who plays for a team of a different anime or game than his own (bought from another team, or signed from outside) gets a small ✈️ beside his name on the squad, team page, team sheets and the market lists, and an **Overseas** chip on his profile and match card. It is worked out from his origin, so running careers get it, and it goes away if he returns to his own team.
- **More animation screens** (`EventScreens.tsx`, each about 2.5 seconds, tap to skip, all on by default): a **four** (the ball races
  along the ground to the rope in the direction it was hit while the two nearest fielders chase it and come up short, the
  rope flashes, FOUR!), a **wide** (the ball sails wide of the stumps and the umpire stretches his arms), a **bye** (it beats the
  bat and the keeper, who dives and misses, and they run), a **leg bye** (off the pad and away), and a **maiden over** (six
  zeros light up, MAIDEN! with the bowler's figures). They show for a single ball played one at a time (not when a whole over
  or innings is simulated at once). The Controls panel's **Animations** section has a checkbox for each group: Wicket replay,
  Boundaries (four and six), Extras (wide, bye, leg bye) and maidens, and Free hit screen. Dots, ones, twos and threes get none.
- **Free hit** (`FreeHitScreen.tsx`): after a **no-ball** a short screen of its own plays (about 2.5 seconds, tap to skip): the
  bowler has overstepped, warning stripes, a big **FREE HIT!** and the batsman who gets the swing ("he can only be run out").
  It is the no-ball that triggers it, not the free-hit ball itself. The field then has a **red border and glow** and a
  **FREE HIT NEXT BALL** tag while the free hit is waiting, and keeps the red border with a **FREE HIT BALL** tag after it is
  bowled, so you can see what it did. The Controls panel's **Animations** section has a **Free hit screen** checkbox.
- **Six animation** (`SixReplay.tsx`): every six plays a short screen of its own (about 3 seconds, tap to skip): the ball
  leaves the bat, climbs over the stands and out of the ground, and a counter runs up to how far it went in metres
  (`sixDistance` in `engine/shots.ts`: a stable figure from the ball number and the batsman's power, no randomness). It says
  "His longest six yet" when he beats an earlier one. The longest six of every batsman is kept in each match result
  (`six`), shown as **Longest 6** in Stats > Batting, as a **Longest six** record (with the player and match) in Stats > Records,
  and in player popups; matches played before this have none on record.
- **Fields for each stage of the game** (`fieldSets.ts`; scenery only, the engine never reads it, so results, replays and saves do not change): the fielders stand in a different set for the **powerplay** (catchers in, two on the rope), the **middle overs** (the original ring), the **death overs** (back on the rope), a **free hit** and the **last over of a chase with 12 or fewer needed** (everyone guards the rope). Against a spinner the keeper stands up and a man goes to short leg; for a left-hander the field is mirrored (kept right-handed while you aim shots yourself, so the gaps still match). The fielders glide between sets, and a small tag at the top-left of the field names the stage. The wicket replay and four screen use the fielder's real position in that set.
- **One screen for a fifty, a hundred and a wicket** (`MilestoneScreen.tsx`, `WicketReplay.tsx`): the two batsmen walk to the middle and bump fists, then FIFTY! / CENTURY! slams in with the scorer's portrait, runs off balls, strike rate and boundaries. The wicket replay carries his innings (how he was out, score, strike rate, fours and sixes, a DUCK stamp). The old separate OUT! and milestone cards are gone.
- **Bowler screens** (`BowlerScreens.tsx`): a **hat-trick** (the three batsmen go one ball at a time over flames, then HAT-TRICK! slams in) and a **five-wicket haul** (the five batsmen fall in a row under the bowler holding the ball up, with his figures) play after the wicket replay. They follow the *Wicket replay* animation switch and wait for a tap when *pause on wickets* is on. In a final, the winners' captain **lifts the trophy** on the CHAMPIONS screen: it rises with a flash of gold and a confetti burst.
- **More moments**: a **duck** and a **golden duck** (out to the first ball) get a short screen with a duck waddling past; a **hundred or more** adds the helmet coming off and the bat going up to the fist-bump screen; **back-to-back maidens** by the same bowler show TWO IN A ROW with a red pressure glow; a **stumping** adds a slow-motion close-up on the gloves and bails inside the replay; the team passing 100, 150, 200... shows an *N UP* banner; in the last two overs of a chase the field shows **Need N off N balls** (it pulses red in the last over); and a finished tournament opens a **Man of the series** reveal the first time you look at it (and from a button on the tournament page).
- **Reviews, third umpire and ball tracking** (`ReviewScreens.tsx`, `season/moments.ts`): an **lbw** replay is now the broadcast ball-tracking picture (pitching, impact and wickets, with "umpire's call" when it only just hits); about a third of lbw outs have the batsman ask for a **review** first (the T signal, checking, the decision stands); about one ball in 30 with no wicket has the bowling side ask for a **review** of a not-out (ball tracking says missing or umpire's call, the decision stands). A **run out** goes to the **third umpire** on a stadium screen: it flashes RUN OUT?, shows the bat short of the crease with the gap measured in cm, then OUT!. Nothing here changes a result: the match had already decided it, the screens only show it. Switch: *Reviews and third umpire*.
- **Partnership screen** (`TimeoutScreens.tsx`): when a stand passes 50, 100, 150... the two batsmen walk together and clasp hands, with the stand's size and who made how many (follows the fifties-and-hundreds switch).
- **Strategic timeouts**: a TV screen for 30 seconds (15 at 2x, 8 at 4x; tap to carry on) after 7 and 14 overs of each T20 innings and after 12 and 30 overs of each ODI innings. The first 20 seconds (two thirds of it) are a **highlight reel of real footage**: the best balls of a recent match played again on the real field view, small, on the TV (a batsman's fours, sixes, 2s and 3s, or a bowler's wickets and dot balls, up to 14 balls, each with a caption). Every finished match now saves one reel (its best innings or spell, about a dozen small numbers: `season/reel.ts`), picked from the last ten matches, so matches played before this update have none; in a first game, a friendly, or until one has been played, it shows a stats card or the best bat and bowler to watch instead. The rest of the time cycles through the innings so far, a tactics board (the pitch and, in a chase, what is needed) and a few numbers. Switch: *Strategic timeouts*.
- **Overseas arrow on portraits**: a player's round picture also carries a small ✈️ when he plays for a team of another anime or game (pictures 30 px or larger).
- **One pause rule**: auto-play pauses on the events ticked under *Pause on* (wickets, fifties and hundreds, boundaries, innings end), and the screen for that event waits for your tap too. Every other screen closes by itself.
- **Story screens in the match** (`StoryScreens.tsx`): **Hat-trick ball** (a heartbeat build-up when a bowler is on two in two), **Nervous nineties** (a batsman reaching 90 to 99), the **Target** at the start of a chase (counts up, with the required rate), a **Super over** for a tied knockout (the winner is the same one the saved result uses), a **Momentum shift** (the win-chance bar swinging when the chase's chances move by about a fifth within two overs), a **Record** flash (highest score, quickest fifty or best bowling of the season so far, with the old mark), and **Powerplay over / Death overs begin** (the real field sets, with the fielders walking to their new places). A big over (12+ runs or two wickets) gets a small banner. A caught-behind can be reviewed with the **sound-spike graph** (`SnickoView`), and a bowled gets the slow-motion close-up the stumping has. Switches: *Match intros* (target, super over), *Momentum, records, phase changes, over banners*, plus the wicket, fifties-and-hundreds and reviews switches for the rest.
- **Before the match** (`LineupScreens.tsx`): a semi-final or final opens on a **big-match intro** (trophy spinning between the crests, THE FINAL); after the toss each side's **starting XI flips in** card by card (batting order, captain, keeper, rating; Skip at any time). Switch: *Match intros*.
- **Post-match interview**: the Man of the Match screen has a speech-bubble quote chosen from what he did (a big innings, a spell, fielding, or the team win; `data/quotes.ts`).
- **Player upgrades** (`NewsScreens.tsx`): after the Man of the Match, your players whose rating rose in that match count up from the old rating to the new one, with a **tier up** badge (for example Solid to Star).
- **Career news that opens by itself, once each** (Calendar): **Injury breaking news** (a TV bulletin when one of your players gets hurt), **Qualified / Eliminated** when a competition's league or group stage ends, a **New coach** reveal each new year, and **Deadline day** on the last day of a market window (coins, squad, offers). The market opens with **Fresh faces**, the window's best four young players, the first time you look. A new **Awards night** (Season review): Golden Bat, Golden Ball, Player of the Year and the Team of the Season as a formation, opening after the recap and from a button. `season/stories.ts` has the logic (season records, playoff status, upgrades, awards, super over).
- **Match records**: each finished match now also saves its quickest fifty (`ff`), used for the *Fastest fifty of the season* record; matches played before this update have none.
- **Cheerleaders** (`CheerScreen.tsx`): after roughly one boundary or wicket in three (never two within 30 balls) a short screen shows four 2D dancers with pom-poms, a top and skirt in the team's colours, swaying to the beat, under "GO TEAM!" (the batting side's squad after a boundary, the fielding side's after a wicket). Switch: *Crowd and fun screens*.
- **More break-the-monotony screens** (`AmbientScreens.tsx`, same switch and the same 30-ball gap as the cheerleaders; they change nothing in the match): after a boundary, **the stands** (rows of fans in the batting team's colours bouncing and waving scarves, THE ARMY!), or **fireworks** after a six at the death; after a wicket, the fielding side's **huddle** (eight players in a ring around a fire); at the end of some overs, **the wave** (a Mexican wave across both teams' fans), the **fan cam** (a TV with a fan's face reacting, happy when the score is racing, shocked when it is not), **In the box** (two commentators' speech bubbles, one with the score, one a quip that fits a chase; `data/quips.ts`) or a **blimp** flying across with the team name; when a chase begins, sometimes the **floodlights** coming on; and **fireworks** when the team passes 100, 150 or 200.
- **Timeout music** (`audio/music.ts`): the strategic timeout plays one of four tunes made in the browser (Funk, Chill, Arcade, Anthem), never the same one twice in a row, fading out when it ends or you close it. It follows the sound mute switch and downloads nothing.
- **A different highlight each timeout**: the reel is now picked at random from the best plays of the last 24 matches, and the timeouts of one match never repeat a reel until all have been shown. The over summary banner is now a slim small banner.
- **Animations are never skipped**: screens queue up and play one after another. Auto-play now waits until every queued screen has played (before, a ball could slip in at the exact moment one ended and cut the rest short); pressing **Next ball** while screens are still waiting moves on to the next screen instead of playing the ball; changing the batting plan, the aim or the bowler no longer closes what is on screen; and the **last ball of the match** plays its own screens (a six, a wicket, a hundred) before the winners' celebration instead of going straight to it.
- **Animation level** (Controls, *Animations*): **Full**, **Light** (wickets, sixes, fifties and hundreds only) or **Off**, with the individual switches under *Advanced*. Older saves' single boundary switch carries over to both four and six.
- **Squad helpers** (My Squad and Edit squad, season/recommend.ts): **Recommended** sets the best XI for your next match (in a career it counts form and injuries, the way the computer picks, but never rests anyone); **New blood** squeezes in as many youngsters as the next match can afford (a knockout allows the XI to get about 1.5 points weaker, a league match 3, a friendly or series game 6; your best six, the captain and the keeper never make way, and there must be five bowling options) or says it is not a good idea. The form indicator is only a slim vertical bar beside the rating (no words).
- **Studio experts** mostly agree with each other (about 93% of reactions); one in about fifteen is a disagreement. **My squad on a phone** shows each player's form as a thin vertical bar beside his rating (fuller and greener is better); the desktop keeps the horizontal bar.
- **Special wicket screens** (WicketScreens.tsx, own switch *Special wicket screens* under Animations > Advanced, off in Light): a **bowled** gets the stump cam (the ball races at the lens, the stumps cartwheel in slow motion, a speed in km/h and how it beat the bat); a **stumping** gets the third umpire's three frames and how many cm out of the crease; a **hit wicket** is shown in slow motion; a **catch in the deep** (fielder far out in the field) shows the ball's height and hang time, then the third umpire's close-up of his boot against the rope; any other catch (slips, covers, caught and bowled) gets the catch cam with the reaction time (some dive). A catch to the keeper keeps the Snicko screen. With *Momentum, records...* on, a wicket also brings a **Nelson** screen (out on 99, 111, 222...), a **pair or king pair** in a Test, and **Partnership broken** after a stand of 60 (T20) or 100 runs. Numbers come from the ball's seed (catchFor, handsFor, stumpGap, owledFor in season/moments.ts) and never touch the result.
- **Every lbw and every catch behind has its own TV screen** (ReviewScreen with plain: true; reviewed ones keep the T signal first): an lbw shows ball tracking (pitching, impact, wickets), a catch to the keeper shows Snicko: a straight vertical line sweeps across the sound graph, the wave spikes where the ball passes the bat, then the moment plays again in slow motion, zoomed in. The wicket replay after an lbw no longer repeats the tracker (it still shows it when the review screens are switched off).
- **Phone performance**: no blur filters (`backdrop-blur`) anywhere, since they are costly over moving content; the chase glow animates only scale; the cheerleader screen draws 3 dancers and 6 sparkles on a phone; the studio's rotating rays are promoted to their own layer; the commentary feed copies only the latest 90 events.
- **Match preview** (`MatchPreview.tsx`, `season/preview.ts`): before the toss every match opens on a preview: both teams with their average rating, last five results (careers), the top bat and top bowler, how the two have got on before (a line like "X have won the last 3 meetings"), who is ahead on paper, and the pitch.
- **Pitch** (`engine/pitchInfo.ts`): every match already had a hidden pitch (how easy to bat on, help for pace, help for spin) drawn from its seed and used by the engine. It is now put into words (flat, slow, green, dead, dry and turning, hard and true, balanced) on the preview and tints the grass and the strip on the field. Nothing about results changed.
- **Season recap** (`SeasonRecap.tsx`, `season/recap.ts`): the Season review page has a **Watch your recap** button, and it opens by itself once when the season is complete. Full-screen pages (tap right for next, left for back): your record, titles, top run-scorer, top wicket-taker, biggest win, **career milestones passed this year** (500 / 1,000 / 2,000... career runs, 25 / 50 / 100... career wickets, counted over all your finished years) and rising stars.
- **Sound and haptics**: the crowd goes quiet as a wicket ball is on its way, then the stumps rattle and the crowd groans; no two bat cracks sound alike; a fifty or hundred gets a fist-bump thud and a longer buzz. Reviews and appeals have sound too: a synthesized fielders' **"How's that?!"** shout (an open "how" into a sharp "zat") when a side appeals, the third umpire's checking beeps, and a stinger and crowd reaction for OUT or NOT OUT (the shout also starts an lbw or stumping replay). All made in the browser like the other sounds, so nothing extra is downloaded.
- **Less clutter on phones**: the Calendar shows one big button (the Sim or Play before your match) with the skip options folded under *Skip ahead*, the market dates and the filters folded away, and no duplicate next-match or market banners; the match field drops the team legend and the long field note; the live scorecard hides the score header that the top bar already shows; the Market header is shorter; Tournaments leads with the list instead of a banner. My squad shows full player names (the form bar is hidden on phones, and the help text is folded under *How this works*); the Controls panel folds *Pause on* into one line; the team page's record tiles are three across; Tournaments shows five upcoming matches. `CLAUDE.md` at the top of the repo holds the project's context and working rules for Claude Code.
- **To do today** card at the top of the Calendar: your next match, the coach, the market (and offers waiting), and your physios, each a tap away. It is worked out from the season, so running careers get it.
- **Market**: search by name or anime, sort (best rated, cheapest, name), filter by role and by anime or game, and a 12-second **Undo** after a signing or release (only while nothing else has happened in the market). Small text on phones was raised by a step.
- **Animations switches**: in the Controls panel (when you are not playing manually) an **Animations** section has two
  checkboxes, **Wicket replay** and **Boundary (six) animation**; both on by default and remembered.
- **Wicket replay** (`WicketReplay.tsx`): every wicket first plays a separate screen of its own, about 4 to 5 seconds, showing
  how it happened (tap to skip), and then the batsman's usual OUT moment comes up. The scene is the ground from above
  with the pitch, the stumps and the people involved. Bowled: the bowler runs in and the stumps fly. LBW: it hits the pad,
  the bowler appeals and the umpire's finger goes up. Caught: the ball goes to the fielder, he catches it and the bowler
  runs over to him. Caught and bowled: the bowler takes it. Run out: the batsmen run, the fielder throws and the stumps go.
  Stumped: the batsman steps out, the keeper takes it and the stumps go. Hit wicket: his own bat hits the stumps.
  The OUT screen fades in as the replay fades out, with no gap between them. Higher auto-play speeds play it quicker. The field itself is not changed.
- **Auto-play button**: tap to cycle 1x, 2x, 4x, off.
- **Innings break**: the innings summary card comes up first (top scorers, best bowling, the target) with only a Close
  button, so it never starts anything. The sides stay as they were (the controls say "Innings break") until you press
  **Next innings**, which swaps batting and bowling. The next innings never starts by itself. The field is hidden during the break, the Controls and auto-play buttons are
  not shown, and the next innings' introductions wait until you press Next innings. The screen stays on the finished innings (scoreboard, scorecard,
  commentary) while the big Next ball button becomes **Next innings** (also on a small card with the target); nothing
  plays until you press it.
- **Controls** (the round buttons, bottom right): next ball, auto-play, and a panel with finish over, sim N overs,
  next wicket, end innings, finish match, batting plan, bowler choice and forfeit.
- **Auto-play** pauses where you tick it: wickets, boundaries, end of an innings. With the wicket pause off, introductions are half as long.
- **Charts**: the two teams are always drawn in clearly different colours (`distinctAccents` in `ui.tsx`: if their colours are close the second team switches to its other colour or a contrasting one).
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
- **Toss screen** (IN and OUT lines): the ▲ In and ▼ Out labels stay put and the names beside them scroll sideways, with no scrollbar, when there are too many to fit.
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
- **The computer's bowling changes** (`chooseBowler` in `engine/ai.ts`): the captain reads how each bowler has gone this innings
  (economy and wickets against what is normal). A bowler who is going well keeps getting the ball until his overs are up. A bowler
  who has been hit for a big over is taken off and rested for as long as the damage deserves (a bad over is one that went for
  about 12+ in a T20), and he is less likely to come back while the batsman who hit him is still in, and happier to come back when
  that batsman has gone. A bowler who has kept the current batsman quiet gets a lift, and when the real bowlers are all needed for the
  overs that are left they are all used. In a test run, good bowlers who missed out on a full quota fell from 29% to 7%.
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
