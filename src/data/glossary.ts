/**
 * Plain-words meanings for every rating and stat name shown in the app. A name in a table header or marked
 * `data-gloss` shows its meaning on hover (see components/Glossary). Keys are lower-case.
 */
export const GLOSSARY: Record<string, string> = {
  // --- ratings (1 to 99) ---
  overall: 'One rating that sums up the player, weighted by his role: batting for batsmen, bowling for bowlers, both for all-rounders.',
  rating: 'His overall rating, 1 to 99. 50s are solid regulars, 70s are stars, 85+ are all-time greats.',
  technique: 'Batting. Defence and shot selection: how well he plays good deliveries, swing and spin without getting out.',
  power: 'Batting. Boundary-hitting strength: how often and how far he clears the field. More fours and sixes, at some risk.',
  temperament: 'Batting. Composure under pressure: keeps going after a start, copes with tight chases and big matches.',
  running: 'Batting. Speed between the wickets: turning ones into twos and avoiding run-outs.',
  accuracy: 'Bowling. Line and length: hits the right spot more often, so fewer runs per over and more dot balls.',
  variation: 'Bowling. Wicket-taking threat: swing, spin, pace changes and deception that get batsmen out.',
  stamina: 'Bowling. Holds his quality through a long spell. Tired bowlers lose accuracy.',
  fielding: 'Catching, ground fielding and throwing. Better fielders save runs and take more catches.',
  keeping: 'Wicketkeeping: taking the ball cleanly, catching behind and stumping.',
  change: 'How much his rating has moved from where it started (green is up, red is down).',
  'last match': 'What his most recent match did to his rating: a good game raises it, a poor one lowers it.',
  // --- batting ---
  r: 'Runs: scored by a batsman, or given away by a bowler.',
  b: 'Balls faced.',
  '4s': 'Fours hit.',
  '6s': 'Sixes hit.',
  'longest 6': 'The longest six he has hit, in metres, measured from the bat to where the ball landed. Only matches played since this was tracked count.',
  sr: 'Strike rate. For a batsman, runs per 100 balls (higher is faster). For a bowler, balls per wicket (lower is better).',
  'strike rate': 'Runs scored per 100 balls faced. Higher means he scores faster.',
  inns: 'Innings batted.',
  runs: 'Runs scored (or given away, in a bowling table).',
  hs: 'Highest score. A star (*) means he was not out.',
  best: 'Best performance. For a batsman his highest score, for a bowler his best wickets/runs figures.',
  avg: 'Average. Batting: runs per dismissal (higher is better). Bowling: runs conceded per wicket (lower is better).',
  average: 'Runs scored per time he was out. Higher is better.',
  '50': 'Fifties: innings of 50 to 99.',
  '100': 'Hundreds: innings of 100 or more.',
  '50/100': 'Fifties and hundreds scored.',
  '50s / 100s': 'Fifties and hundreds scored.',
  'fours / sixes': 'Fours and sixes hit.',
  // --- bowling ---
  o: 'Overs bowled.',
  ov: 'Overs bowled.',
  mdn: 'Maidens: overs in which no runs were scored off the bat.',
  w: 'Wickets taken by a bowler. In a team table, matches won.',
  wkts: 'Wickets taken.',
  wickets: 'Wickets taken.',
  econ: 'Economy rate: runs conceded per over. Lower is better.',
  economy: 'Runs conceded per over. Lower is better.',
  'bowling avg': 'Runs conceded per wicket. Lower is better.',
  '5w': 'Five-wicket hauls: innings with 5 or more wickets.',
  '5-wicket hauls': 'Innings in which he took 5 or more wickets.',
  'bat apps': 'Batting appearances: matches in which he batted. Averages and strike rate are worked out from these only.',
  'bowl apps': 'Bowling appearances: matches in which he bowled. Economy and bowling average are worked out from these only.',
  // --- both / teams ---
  m: 'Matches played. In a bowling scorecard, maidens.',
  matches: 'Matches played: every match he was in the XI for, whether or not he batted or bowled.',
  p: 'Matches played.',
  l: 'Matches lost.',
  t: 'Matches tied.',
  'win %': 'Share of matches won.',
  'win rate': 'Share of matches won.',
  nrr: 'Net run rate: runs scored per over minus runs conceded per over. It splits teams that are level on points.',
  pts: 'Points: 2 for a win, 1 for a tie.',
  form: 'Results of the last five matches, oldest to newest: W win, L loss, T tie.',
  titles: 'Tournament finals won.',
  impact: 'A rough all-round score: runs, boundaries, wickets, maidens and awards added up. Used for "most valuable".',
  mom: 'Man of the Match awards.',
  awards: 'Man of the Match awards.',
  points: 'Impact points: runs, boundaries, wickets, maidens and awards added up.',
}

/** Look a heading up (ignoring case, sort arrows and spacing). */
export function glossaryFor(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  const key = text.replace(/[▲▼↑↓]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  return GLOSSARY[key]
}
