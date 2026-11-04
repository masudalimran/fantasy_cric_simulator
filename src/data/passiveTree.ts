/**
 * The passive tree (design prototype): perks that belong to a ROLE, not to a named player. Whoever fills the role in your XI (the opener, the captain,
 * the keeper, the bowler in the death overs...) gets the benefit, so choosing who plays where is the build. Each branch is a ladder: `row` goes down,
 * `lane` is 0 to 2 across, and a perk can be taken when it is in row 0 or when any perk in `req` is already taken.
 * `kind`: s = small (1 point), n = notable (2), k = keystone (3, a big gain with a real cost).
 */
export type NodeKind = 's' | 'n' | 'k'
export interface TreeNode { id: string; branch: string; row: number; lane: 0 | 1 | 2; name: string; kind: NodeKind; text: string; real?: string; req: string[] }
export interface Branch { id: string; name: string; icon: string; color: string; who: string }

export const COST: Record<NodeKind, number> = { s: 1, n: 2, k: 3 }

export const BRANCHES: Branch[] = [
  { id: 'open', name: 'Openers', icon: '🏏', color: '#f87171', who: 'For the batsman who faces the new ball' },
  { id: 'fin', name: 'Finishers', icon: '💥', color: '#fb923c', who: 'Middle order and the last overs' },
  { id: 'pace', name: 'Pace', icon: '🔥', color: '#fbbf24', who: 'Fast and medium bowlers' },
  { id: 'spin', name: 'Spin', icon: '🌀', color: '#34d399', who: 'Off, leg and left-arm spin' },
  { id: 'keep', name: 'Gloves and field', icon: '🧤', color: '#22d3ee', who: 'Keepers and fielders' },
  { id: 'capt', name: 'Captain', icon: '👑', color: '#a78bfa', who: 'Leadership, reviews, tosses' },
  { id: 'club', name: 'Club and money', icon: '💰', color: '#facc15', who: 'Coins, youth, injuries' },
  { id: 'day', name: 'Matchday', icon: '🏟️', color: '#60a5fa', who: 'The whole team on the day' },
]

const n = (id: string, row: number, lane: 0 | 1 | 2, name: string, kind: NodeKind, text: string, req: string[] = [], real?: string): TreeNode => ({ id, branch: id.split('.')[0], row, lane, name, kind, text, req, real })

export const NODES: TreeNode[] = [
  // ---- Openers
  n('open.1', 0, 1, 'Opening batsman', 's', 'Your opening pair: +2 power and +2 technique in the powerplay.'),
  n('open.2', 1, 0, 'Aggressor', 'n', 'Openers: +4 power in the powerplay, but -2 technique.', ['open.1']),
  n('open.3', 1, 2, 'Steady start', 's', 'Openers: +3 temperament in the first 10 overs.', ['open.1']),
  n('open.4', 2, 0, 'Boundary hunter', 's', 'Openers: +2 power against pace.', ['open.2']),
  n('open.5', 2, 1, 'Batting first', 'n', 'Openers: +3 technique and temperament when your side bats first.', ['open.2', 'open.3'], 'Counts only in the first innings.'),
  n('open.6', 2, 2, 'Chaser', 's', 'Openers: +3 power and temperament when chasing.', ['open.3']),
  n('open.7', 3, 1, 'Run machine', 'n', 'Openers: +3 running, +2 temperament.', ['open.5']),
  n('open.8', 4, 0, 'Fearless', 's', 'Openers: more risk and more reward in the first six overs.', ['open.4', 'open.7']),
  n('open.9', 5, 1, 'Glass cannon', 'k', 'Openers: +8 power, but -4 technique.', ['open.7'], 'A big gain with a real cost: he scores faster and is out sooner.'),
  // ---- Finishers
  n('fin.1', 0, 1, 'Middle-order anchor', 's', 'Numbers 4 to 6: +2 technique and temperament in the middle overs.'),
  n('fin.2', 1, 0, 'Death hitter', 'n', 'Anyone batting in the last 5 overs: +4 power.', ['fin.1']),
  n('fin.3', 1, 2, 'Pressure player', 's', 'Under pressure: +3 temperament.', ['fin.1']),
  n('fin.4', 2, 0, 'Six machine', 's', 'Death overs: +2 power against spin.', ['fin.2']),
  n('fin.5', 2, 1, 'Running hard', 's', 'Numbers 5 to 8: +3 running.', ['fin.2', 'fin.3']),
  n('fin.6', 2, 2, 'Clutch', 'n', 'When chasing the last 30 runs: +4 temperament and power.', ['fin.3']),
  n('fin.7', 3, 1, 'Lefty edge', 's', 'Left-handers: double the left-hand edge against right-arm bowlers.', ['fin.5'], 'The left-hander edge is already in the game; this doubles it.'),
  n('fin.8', 4, 1, 'Tail-ender', 's', 'Numbers 9 to 11: +4 technique.', ['fin.7']),
  n('fin.9', 5, 1, 'All or nothing', 'k', 'Death overs: +9 power, -5 technique.', ['fin.4', 'fin.6'], 'More sixes, more wickets.'),
  // ---- Pace
  n('pace.1', 0, 1, 'New ball', 's', 'Pace bowlers: +2 variation in the powerplay.'),
  n('pace.2', 1, 0, 'Yorker king', 'n', 'Pace bowlers in the death overs: +3 accuracy and +3 variation.', ['pace.1'], 'The game does not draw yorkers separately, so this makes the death overs harder for batsmen.'),
  n('pace.3', 1, 2, 'Short-ball hunter', 's', 'Pace bowlers: +3 variation against the first three batsmen.', ['pace.1'], 'Works through the batting order, as the game has no separate short ball.'),
  n('pace.4', 2, 0, 'Death specialist', 's', 'One chosen bowler: +4 accuracy in the death overs.', ['pace.2']),
  n('pace.5', 2, 1, 'Bowling first', 'n', 'Pace bowlers: +3 variation when your side bowls first.', ['pace.2', 'pace.3']),
  n('pace.6', 2, 2, 'Stamina', 's', 'Pace bowlers: +4 stamina, so spells hold up.', ['pace.3']),
  n('pace.7', 3, 1, 'Swing and seam', 'n', 'Pace bowlers: +3 variation on a pitch that helps them.', ['pace.5']),
  n('pace.8', 4, 1, 'Wicket-taker', 's', 'Pace bowlers: slightly more wickets when a batsman is set.', ['pace.7']),
  n('pace.9', 5, 1, 'Fireball', 'k', 'Your fastest bowler: +8 variation, but -4 stamina.', ['pace.7'], 'Great in short spells.'),
  // ---- Spin
  n('spin.1', 0, 1, 'Slow and sly', 's', 'Spinners: +2 variation in the middle overs.'),
  n('spin.2', 1, 0, 'Turn master', 'n', 'Spinners: +4 variation on a pitch that turns.', ['spin.1']),
  n('spin.3', 1, 2, 'Strangler', 's', 'Spinners: +3 accuracy in the middle overs.', ['spin.1']),
  n('spin.4', 2, 0, 'Googly', 's', 'Wrist spinners: +3 variation against the opposite hand.', ['spin.2']),
  n('spin.5', 2, 1, 'Flight', 'n', 'Spinners: +3 variation to new batsmen.', ['spin.2', 'spin.3']),
  n('spin.6', 2, 2, 'Powerplay spinner', 's', 'Spinners: +3 accuracy in the powerplay.', ['spin.3']),
  n('spin.7', 3, 1, 'Patience', 'n', 'Spinners: +3 stamina and +2 accuracy in long spells.', ['spin.5']),
  n('spin.8', 4, 1, 'Left-arm wizard', 's', 'Left-arm spinners: +3 variation.', ['spin.7']),
  n('spin.9', 5, 1, 'Web of spin', 'k', 'Spinners: +8 variation to new batsmen, but -4 against well-set ones.', ['spin.5']),
  // ---- Gloves and field
  n('keep.1', 0, 1, 'Safe hands', 's', 'Your keeper: +3 fielding.'),
  n('keep.2', 1, 0, 'Stumper', 'n', 'Your keeper: more stumpings off the spinners.', ['keep.1']),
  n('keep.3', 1, 2, 'Run-out hawk', 's', 'Every fielder: +2 fielding when a run out is on.', ['keep.1']),
  n('keep.4', 2, 0, 'Catching lessons', 's', 'Keeper: +3 fielding in the first 10 overs.', ['keep.2']),
  n('keep.5', 2, 1, 'Boundary rider', 'n', 'Outfielders: +3 fielding, so fewer fours.', ['keep.2', 'keep.3']),
  n('keep.6', 2, 2, 'Electric', 's', 'Your best fielder: +4 fielding.', ['keep.3']),
  n('keep.7', 3, 1, 'Slip cordon', 'n', 'Catches off the edge are held more often.', ['keep.5']),
  n('keep.8', 4, 1, 'Reflexes', 's', 'Keeper: +3 fielding against pace.', ['keep.7']),
  n('keep.9', 5, 1, 'Iron gloves', 'k', 'Keeper: +9 fielding, -5 batting.', ['keep.4', 'keep.7'], 'He almost never drops anything but scores less.'),
  // ---- Captain
  n('capt.1', 0, 1, 'Born leader', 's', 'The captain: +2 temperament.'),
  n('capt.2', 1, 0, 'Sharp reviews', 'n', 'Your reviews succeed a little more often.', ['capt.1'], 'Changes DRS results by a few per cent.'),
  n('capt.3', 1, 2, 'Reads the pitch', 's', 'The toss advice is clearer and you win the toss slightly more often.', ['capt.1']),
  n('capt.4', 2, 0, 'Tactician', 's', 'Captain: +2 accuracy for the bowlers he chooses.', ['capt.2']),
  n('capt.5', 2, 1, 'Leading by example', 'n', 'Captain: +3 to his main skill.', ['capt.2', 'capt.3']),
  n('capt.6', 2, 2, 'Calm under fire', 's', 'Team: +1 temperament when the captain is at the crease.', ['capt.3']),
  n('capt.7', 3, 1, 'Inspiring', 'n', 'Team: +1 to every rating while the captain is on the field.', ['capt.5']),
  n('capt.8', 4, 1, 'Big-match captain', 's', 'Finals and knock-outs: captain +4 temperament.', ['capt.7']),
  n('capt.9', 5, 1, 'The general', 'k', 'Team: +2 to every rating, but only while the same captain stays.', ['capt.7'], 'Changing the captain loses it.'),
  // ---- Club and money
  n('club.1', 0, 1, 'Frugal', 's', 'Buildings cost 5% less.'),
  n('club.2', 1, 0, 'Sharp scouts', 'n', 'Scouting trips cost less and find talents more often.', ['club.1']),
  n('club.3', 1, 2, 'Good hands', 's', 'Training camps have a better chance of a breakthrough.', ['club.1']),
  n('club.4', 2, 0, 'Bigger academy', 's', 'The academy sets aside one more prospect.', ['club.2']),
  n('club.5', 2, 1, 'Sponsors', 'n', 'Year-end earnings +5%.', ['club.2', 'club.3']),
  n('club.6', 2, 2, 'Patient lessons', 's', 'Lessons fail a little less often.', ['club.3']),
  n('club.7', 3, 1, 'Physio team', 'n', 'One more physio, and injuries heal faster.', ['club.5']),
  n('club.8', 4, 1, 'Negotiator', 's', 'Releasing a player pays 75% back instead of 70%.', ['club.7']),
  n('club.9', 5, 1, 'Moneyball', 'k', 'Wages -10%, but no stadium building.', ['club.5'], 'More coins, less pride.'),
  // ---- Matchday
  n('day.1', 0, 1, 'Home comforts', 's', 'A small bonus when you play at home.'),
  n('day.2', 1, 0, 'Winning habit', 'n', 'After 3 wins in a row: the team gains +1.', ['day.1']),
  n('day.3', 1, 2, 'Fast starters', 's', 'The team: +1 in the powerplay.', ['day.1']),
  n('day.4', 2, 0, 'Extra boost', 's', 'Boost tokens last for one more match.', ['day.2']),
  n('day.5', 2, 1, 'Super over nerves', 'n', 'Super overs: +3 temperament for your batsmen.', ['day.2', 'day.3']),
  n('day.6', 2, 2, 'Fitness', 's', 'Your players get tired slower in the late overs.', ['day.3']),
  n('day.7', 3, 1, 'Crowd favourite', 'n', 'Your home games: the team +1.', ['day.5']),
  n('day.8', 4, 1, 'Ice cold', 's', 'Chasing: +1 in the last 5 overs.', ['day.7']),
  n('day.9', 5, 1, 'All in', 'k', 'One boost token a season is twice as strong, but you only get one.', ['day.5'], 'The 1.5 times becomes 2 times.'),
]

export const NODE_BY_ID = new Map(NODES.map((x) => [x.id, x]))
export const MAX_LEVEL = 60
/** Levels that grant an extra point. */
export const BONUS_LEVELS = [10, 20, 30, 40, 50, 60]
export const pointsAt = (level: number): number => level + BONUS_LEVELS.filter((b) => level >= b).length
export const xpFor = (level: number): number => 40 + 6 * level

/** Can this perk be taken now? */
export function canTake(node: TreeNode, taken: ReadonlySet<string>): boolean {
  return !taken.has(node.id) && (node.row === 0 || node.req.some((r) => taken.has(r)))
}
