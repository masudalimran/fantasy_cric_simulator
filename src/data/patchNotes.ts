/**
 * Patch notes: what changed in the game, written for the people who play it (no jargon).
 * Newest first. Add a new entry at the TOP for every update; the "What's new" popup shows each player the ones they have not seen yet,
 * and the News page (/news) keeps them all. `id` must be unique and never change once shipped (it is what "seen" is remembered by).
 * `to` is an optional page the "Take a look" button opens (only for pages that need a Career to be open, keep `needsCareer` true).
 */
export interface PatchItem {
  icon: string
  title: string
  text: string
  /** A page to jump to from this item. */
  to?: string
  /** True when the page only works once a Career is open (the button is hidden otherwise). */
  needsCareer?: boolean
}

export interface PatchNote {
  id: string
  /** The day it went live, YYYY-MM-DD. */
  date: string
  title: string
  /** One friendly line under the title. */
  tagline: string
  /** A colour for the card's glow. */
  color: string
  items: PatchItem[]
}

export const PATCH_NOTES: PatchNote[] = [
  {
    id: '2026-11-fine-tuning',
    date: '2026-11-04',
    title: 'Fine-tuning',
    tagline: 'No big new toys. Everything you already have got clearer, safer and easier to find.',
    color: '#38bdf8',
    items: [
      { icon: '📰', title: 'This news screen', text: 'Whenever the game gets an update you will see what changed, once, right when you open it. You can read it all again any time from News (under More on a phone).', to: '/news' },
      { icon: '🎉', title: 'Level-up moment', text: 'Reaching a new level now stops for a short celebration that tells you how many perk points you can spend, with a button straight to your tree.', to: '/career/tree', needsCareer: true },
      { icon: '🏆', title: 'Man of the Match fix', text: 'When a captain won Man of the Match he stayed in the line and never came up for the prize money. He now walks back up for it, and the Man of the Match steps up as soon as he is called.' },
      { icon: '🏏', title: 'Sweeps and down-the-wicket shots', text: 'Batsmen now sweep the spinners more often, including big slog sweeps for six, and sometimes walk down the pitch to a slower ball and hit it back over the bowler. It is all for show: the result of the ball is the same.' },
      { icon: '🎯', title: 'Truer ball tracking', text: 'On an lbw review the ball now follows one smooth curve from the bowler\'s hand to the stumps, bending one way only, instead of wobbling about. You still see the swing and the turn.' },
      { icon: '🪪', title: 'Full career stats on the player card', text: 'Tap a player in a match and his card opens on his whole career. Small tabs under it show any single season.' },
      { icon: '✨', title: 'See your perks work', text: 'When one of your perks helps in a match, a small gold note says so, so you can tell that your points are doing something.' },
      { icon: '🧭', title: 'A clearer Club', text: 'The Club page now starts with "Worth doing now": what you can afford, tokens waiting, free camp places. A short "How the Club works" sits right under it. Your perk points also have their own Perks tab.', to: '/career/club', needsCareer: true },
      { icon: '💾', title: 'Backup reminder', text: 'Your careers live only on this phone. If it has been a while since you saved a copy, the game now reminds you gently on the Home screen.', to: '/backup' },
      { icon: '🏟️', title: 'The stadium can now be finished', text: 'The last level of the stadium cost more coins than a club was allowed to save up, so nobody could ever build it. Your club can now keep more coins from one year to the next, enough to finish every building.' },
      { icon: '⚖️', title: 'Balance check', text: 'We played twelve years of league cricket by itself to make sure no team runs away with everything and that ratings do not balloon, and measured how hard each difficulty really is. No team became unbeatable. Players got a little better over the years, which is how the fast academy was meant to work.' },
    ],
  },
  {
    id: '2026-11-club-levels',
    date: '2026-11-03',
    title: 'The Club, Levels and the Passive Tree',
    tagline: 'Something to spend coins on, and something to work towards.',
    color: '#fbbf24',
    items: [
      { icon: '🏟️', title: 'The Club', text: 'Spend your coins on buildings (a training ground, medical centre, academy and stadium), a better coach, boost tokens, and some lucky draws where the odds are always shown to you. Look after it and it looks after your team.', to: '/career/club', needsCareer: true },
      { icon: '🎓', title: 'Change a player', text: 'Turn a bowler into a batsman, a right-hander into a left-hander, a fast bowler into a spinner. Or pick a favourite and train one skill faster, with a chance he learns a special trait.', to: '/career/club', needsCareer: true },
      { icon: '⭐', title: 'Career levels', text: 'Your career now has a level from 1 to 60. Winning matches, trophies and good years fill the bar you see under your team badge. Every level gives you a point to spend.', to: '/career/tree', needsCareer: true },
      { icon: '🌳', title: 'The Passive Tree', text: 'Spend your points on perks for roles, not for named players: the opener, the captain, the keeper, the death bowler, the veterans, the rookies and more. Put a player in that role and the perks help him. You can start again if you change your mind.', to: '/career/tree', needsCareer: true },
      { icon: '🤝', title: 'Transfers in a conference room', text: 'Every signing is acted out in a boardroom, with a clear card that says who bought whom, from which club, for how much, and on what wage.' },
      { icon: '📊', title: 'Lifetime stats', text: 'The Stats page now shows your whole career first, with a filter for each season. The player card and the introduction cards also show career figures.', to: '/career/stats', needsCareer: true },
      { icon: '🎳', title: 'Every bowler bowls', text: 'A specialist bowler now always gets an over in limited-overs games, and the computer saves its best two bowlers for the end of an innings.' },
    ],
  },
  {
    id: '2026-10-stadium-shows',
    date: '2026-10-31',
    title: 'Six more cut-aways and stadium shows',
    tagline: 'The camera leaves the pitch and the whole stadium comes alive.',
    color: '#f472b6',
    items: [
      { icon: '🚀', title: 'Huge sixes leave the stadium', text: 'The very biggest sixes sail out of the ground. Some land in a river, on a plane, at a wedding, in a pizza scooter. The monster ones go into space.' },
      { icon: '🎯', title: 'Eight moments at the boundary', text: 'Fours now come with their own moments at the rope: the dive, the slide, the fielder who just cannot stop it.' },
      { icon: '🧑‍🤝‍🧑', title: 'Talks and rivalries', text: 'Captains have a word with a bowler who is being hit. Great rivals face off, and the game remembers who has beaten whom.' },
      { icon: '🎬', title: 'Highlights you can share', text: 'The best moments of a match are put together into a short highlights reel you can send to friends.' },
      { icon: '🏆', title: 'Ceremonies', text: 'Trophy lifts, the Man of the Match podium, the toss and line-up walk-out, floodlights coming on and the crowd cheering all play out as part of the stadium.' },
      { icon: '🎛️', title: 'Switches for everything', text: 'Every kind of screen has its own switch in Controls, so you decide how much of the show you want.' },
    ],
  },
  {
    id: '2026-10-broadcast',
    date: '2026-10-25',
    title: 'The Broadcast View',
    tagline: 'The match now looks like it is on TV.',
    color: '#a78bfa',
    items: [
      { icon: '📺', title: 'A TV camera', text: 'A camera stands behind the bowler, follows the ball, and cuts to a camera from the other end. It is the new default way to watch (the view from above is still in Controls).' },
      { icon: '🏏', title: 'Real batting and bowling', text: 'Batsmen play proper shots all round the ground, fielders dive, throw and catch, and the keeper takes the ball. Run outs, stumpings, wides, byes and no balls are all acted out.' },
      { icon: '⚡', title: 'Signature moves', text: 'Every player has his own signature move, drawn in code, so a six by one hero feels different from a six by another.' },
      { icon: '🐉', title: 'Fireballs, snowballs and dragon balls', text: 'The speed of every ball is shown. A very fast ball is a fireball, a very slow one is a snowball, and the fastest of all is a dragon.' },
      { icon: '🎙️', title: 'Voices', text: 'The commentators and the studio show can speak out loud using your phone\'s own voices. The game asks first before it talks.' },
      { icon: '🔍', title: 'Challenges (DRS)', text: 'Teams can ask for a review of an lbw or a catch behind. A review changes the decision about half the time, and it is a real part of the result now.' },
      { icon: '🌤️', title: 'Every ground has its own look', text: 'Stands, boards and crowd colours belong to the home team. Matches are played by day, under the lights, or in the rain.' },
    ],
  },
  {
    id: '2026-10-animations',
    date: '2026-10-16',
    title: 'Animation screens, injuries and Test matches',
    tagline: 'Big moments now get a big show.',
    color: '#34d399',
    items: [
      { icon: '🎞️', title: 'Screens for the big moments', text: 'Wickets, fifties, hundreds, hat-tricks, sixes, fours, maidens, super overs and more each get their own screen. They only wait for you at the biggest moments and close by themselves the rest of the time.' },
      { icon: '🔁', title: 'Wicket replays', text: 'Every wicket shows how it happened: stump cam, a catch on the rope, snicko for an edge, ball tracking for an lbw.' },
      { icon: '📚', title: 'The studio show', text: 'Between innings and after the match a studio panel looks back at what happened and grades the players.' },
      { icon: '🏏', title: 'Test matches', text: 'Five days, four innings, weather, declarations, the follow-on and draws.' },
      { icon: '🩹', title: 'Injuries and physios', text: 'Players get hurt for a few days. Each team has three physios, and an injured player cannot play until he is fit.' },
      { icon: '💰', title: 'Wages and retirement', text: 'Each team earns money from how well it plays and pays its players a yearly wage. Players retire after seven to ten seasons, and young academy graduates take their place.' },
      { icon: '🏆', title: 'Tournament celebrations', text: 'Win a tournament and watch a different celebration for each one.' },
    ],
  },
  {
    id: '2026-10-market-coaching',
    date: '2026-10-12',
    title: 'The player market and coaches',
    tagline: 'Build your squad your way.',
    color: '#fb923c',
    items: [
      { icon: '🛒', title: 'The player market', text: 'It opens twice a year. Sign young talent, buy stars from other teams, release players you do not need, and say yes or no to offers for your own.', to: '/career/market', needsCareer: true },
      { icon: '🧑‍🏫', title: 'Coaches', text: 'Every team has a coach who trains the squad every day. Tell yours what to work on (batting, bowling or fielding) and watch the ratings climb.' },
      { icon: '🎯', title: 'Aim your shot', text: 'In a match you can choose the direction and height of the next shot, or the line, length and pace of the next ball.' },
      { icon: '🔔', title: 'Orange and Purple Caps', text: 'The top run-scorer and top wicket-taker wear a glowing cap.' },
      { icon: '🆕', title: 'Four new teams', text: 'JoJo, Yu-Gi-Oh!, Seven Deadly Sins and InuYasha join the league.' },
    ],
  },
  {
    id: '2026-10-the-start',
    date: '2026-10-10',
    title: 'Fantasy Cric Sim begins',
    tagline: 'Cricket with anime and game heroes.',
    color: '#818cf8',
    items: [
      { icon: '🎮', title: 'Careers', text: 'Pick a team and look after it for a whole season: a calendar of matches, tournaments, standings, stats and a review of how the year went.' },
      { icon: '🪙', title: 'The toss and the match', text: 'Choose your side, flip the coin and play ball by ball or let it play by itself. T20 and one-day games.' },
      { icon: '📈', title: 'Players grow', text: 'Players who do well get better after every match. Tap any face to see his numbers.' },
      { icon: '📱', title: 'Made for your phone', text: 'Install it on your home screen and it works like an app, even without a connection.' },
    ],
  },
]

export const LATEST_PATCH = PATCH_NOTES[0].id
