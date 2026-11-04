/**
 * The passive tree (design prototype): perks that belong to a ROLE, not to a named player. Whoever fills the role in your XI (the opener, the captain,
 * the keeper, the bowler in the death overs...) gets the benefit, so choosing who plays where is the build. Each branch is a ladder: `row` goes down,
 * `lane` is 0 to 2 across, and a perk can be taken when it is in row 0 or when any perk in `req` is already taken.
 * `kind`: s = small (1 point), n = notable (2), k = keystone (3, a big gain with a real cost).
 */
import type { Rule } from '../engine/perks'

export type NodeKind = 's' | 'n' | 'k'
/** What a perk does: match rules for the engine (`engine/perks.ts`), a boost to your team's fielding, and/or numbers the career code reads by name (`perkSum`). */
export interface Fx { rules?: Rule[]; field?: number; review?: number; k?: Record<string, number> }
export interface TreeNode { id: string; branch: string; row: number; lane: 0 | 1 | 2; name: string; kind: NodeKind; text: string; real?: string; req: string[]; fx: Fx }
export interface Branch { id: string; name: string; icon: string; color: string; who: string }

export const COST: Record<NodeKind, number> = { s: 1, n: 2, k: 3 }

export const BRANCHES: Branch[] = [
  { id: 'open', name: 'Openers', icon: '🏏', color: '#f87171', who: 'For the batsman who faces the new ball' },
  { id: 'fin', name: 'Finishers', icon: '💥', color: '#fb923c', who: 'Middle order and the last overs' },
  { id: 'pace', name: 'Pace', icon: '🔥', color: '#fbbf24', who: 'Fast and medium bowlers' },
  { id: 'spin', name: 'Spin', icon: '🌀', color: '#34d399', who: 'Off, leg and left-arm spin' },
  { id: 'keep', name: 'Gloves and field', icon: '🧤', color: '#22d3ee', who: 'Keepers and fielders' },
  { id: 'capt', name: 'Captain', icon: '👑', color: '#a78bfa', who: 'Leadership, reviews, tosses' },
  { id: 'new', name: 'Rookies', icon: '🌱', color: '#4ade80', who: 'Academy youth and new signings' },
  { id: 'vet', name: 'Veterans', icon: '🎖️', color: '#c4b5fd', who: 'Older players and long careers' },
  { id: 'club', name: 'Club and money', icon: '💰', color: '#facc15', who: 'Coins, youth, injuries' },
  { id: 'day', name: 'Matchday', icon: '🏟️', color: '#60a5fa', who: 'The whole team on the day' },
]

const n = (id: string, row: number, lane: 0 | 1 | 2, name: string, kind: NodeKind, text: string, fx: Fx, req: string[] = [], real?: string): TreeNode => ({ id, branch: id.split('.')[0], row, lane, name, kind, text, req, real, fx })
type A = Rule['add']
type C = NonNullable<Rule['if']>
const bat = (who: Rule['who'], add: A, f?: C): Rule => ({ side: 'bat', who, add, ...(f ? { if: f } : {}) })
const bowl = (who: Rule['who'], add: A, f?: C): Rule => ({ side: 'bowl', who, add, ...(f ? { if: f } : {}) })
const R = (...rules: Rule[]): Fx => ({ rules })
const K = (k: Record<string, number>): Fx => ({ k })

export const NODES: TreeNode[] = [
  // ---- Openers
  n('open.1', 0, 1, 'Opening batsman', 's', 'Your opening pair: +1 power and +1 technique in the powerplay.', R(bat('opener', { power: 1, technique: 1 }, { phase: ['powerplay'] }))),
  n('open.2', 1, 0, 'Aggressor', 'n', 'Openers: +2 power in the powerplay, but -1 technique.', R(bat('opener', { power: 2, technique: -1 }, { phase: ['powerplay'] })), ['open.1']),
  n('open.3', 1, 2, 'Steady start', 's', 'Openers: +1 temperament in the powerplay.', R(bat('opener', { temperament: 1 }, { phase: ['powerplay'] })), ['open.1']),
  n('open.4', 2, 0, 'Boundary hunter', 's', 'Openers: +1 power against pace.', R(bat('opener', { power: 1 }, { vsPace: true })), ['open.2']),
  n('open.5', 2, 1, 'Batting first', 'n', 'Openers: +1 technique and temperament in the first innings.', R(bat('opener', { technique: 1, temperament: 1 }, { inn: 'first' })), ['open.2', 'open.3'], 'Counts only in limited-overs matches.'),
  n('open.6', 2, 2, 'Chaser', 's', 'Openers: +1 power and temperament in the second innings (chasing).', R(bat('opener', { power: 1, temperament: 1 }, { inn: 'chase' })), ['open.3'], 'Counts only in limited-overs matches.'),
  n('open.7', 3, 1, 'Run machine', 'n', 'Openers: +1 running and +1 temperament.', R(bat('opener', { running: 1, temperament: 1 })), ['open.5']),
  n('open.8', 4, 0, 'Spin breaker', 's', 'Openers: +1 power against spin.', R(bat('opener', { power: 1 }, { vsSpin: true })), ['open.4', 'open.7']),
  n('open.9', 5, 1, 'Glass cannon', 'k', 'Openers: +3 power, but -2 technique.', R(bat('opener', { power: 3, technique: -2 })), ['open.7'], 'A big gain with a real cost: he scores faster and is out sooner.'),
  // ---- Finishers
  n('fin.1', 0, 1, 'Middle-order anchor', 's', 'Numbers 4 to 6: +1 technique and temperament in the middle overs.', R(bat('mid', { technique: 1, temperament: 1 }, { phase: ['middle'] }))),
  n('fin.2', 1, 0, 'Death hitter', 'n', 'Anyone batting in the death overs: +2 power.', R(bat('any', { power: 2 }, { phase: ['death'] })), ['fin.1']),
  n('fin.3', 1, 2, 'Pressure player', 's', 'Any batsman under pressure: +1 temperament.', R(bat('any', { temperament: 1 }, { pressure: true })), ['fin.1']),
  n('fin.4', 2, 0, 'Six machine', 's', 'Death overs against spin: +1 power.', R(bat('any', { power: 1 }, { phase: ['death'], vsSpin: true })), ['fin.2']),
  n('fin.5', 2, 1, 'Running hard', 's', 'Numbers 5 to 8: +1 running.', R(bat('low', { running: 1 })), ['fin.2', 'fin.3']),
  n('fin.6', 2, 2, 'Clutch', 'n', 'Chasing under pressure: +2 temperament and power.', R(bat('any', { temperament: 2, power: 2 }, { inn: 'chase', pressure: true })), ['fin.3']),
  n('fin.7', 3, 1, 'Lefty edge', 's', 'Left-handers: +1 technique and power.', R(bat('lefty', { technique: 1, power: 1 })), ['fin.5']),
  n('fin.8', 4, 1, 'Tail-ender', 's', 'Numbers 9 to 11: +2 technique.', R(bat('tail', { technique: 2 })), ['fin.7']),
  n('fin.9', 5, 1, 'All or nothing', 'k', 'Death overs: +4 power, -2 technique.', R(bat('any', { power: 4, technique: -2 }, { phase: ['death'] })), ['fin.4', 'fin.6'], 'More sixes, more wickets.'),
  // ---- Pace
  n('pace.1', 0, 1, 'New ball', 's', 'Pace bowlers: +1 variation in the powerplay.', R(bowl('pace', { variation: 1 }, { phase: ['powerplay'] }))),
  n('pace.2', 1, 0, 'Yorker king', 'n', 'Pace bowlers in the death overs: +1 accuracy and +1 variation.', R(bowl('pace', { accuracy: 1, variation: 1 }, { phase: ['death'] })), ['pace.1'], 'The game does not draw yorkers separately, so this makes the death overs harder for batsmen.'),
  n('pace.3', 1, 2, 'Short-ball hunter', 's', 'Pace bowlers: +1 variation against a new batsman.', R(bowl('pace', { variation: 1 }, { newBat: true })), ['pace.1'], 'Works on batsmen in their first balls, as the game has no separate short ball.'),
  n('pace.4', 2, 0, 'Death specialist', 's', 'Every bowler in the death overs: +1 accuracy.', R(bowl('any', { accuracy: 1 }, { phase: ['death'] })), ['pace.2']),
  n('pace.5', 2, 1, 'Bowling first', 'n', 'Pace bowlers: +1 variation in the first innings.', R(bowl('pace', { variation: 1 }, { inn: 'first' })), ['pace.2', 'pace.3'], 'Counts only in limited-overs matches.'),
  n('pace.6', 2, 2, 'Stamina', 's', 'Pace bowlers: +2 stamina, so spells hold up.', R(bowl('pace', { stamina: 2 })), ['pace.3']),
  n('pace.7', 3, 1, 'Swing and seam', 'n', 'Pace bowlers on a pitch that helps them: +1 variation.', R(bowl('pace', { variation: 1 }, { seam: true })), ['pace.5']),
  n('pace.8', 4, 1, 'Wicket-taker', 's', 'Pace bowlers against a set batsman: +1 variation.', R(bowl('pace', { variation: 1 }, { set: true })), ['pace.7']),
  n('pace.9', 5, 1, 'Fireball', 'k', 'Pace bowlers: +2 variation, but -2 stamina.', R(bowl('pace', { variation: 2, stamina: -2 })), ['pace.7'], 'Great in short spells.'),
  // ---- Spin
  n('spin.1', 0, 1, 'Slow and sly', 's', 'Spinners: +1 variation in the middle overs.', R(bowl('spin', { variation: 1 }, { phase: ['middle'] }))),
  n('spin.2', 1, 0, 'Turn master', 'n', 'Spinners on a pitch that turns: +2 variation.', R(bowl('spin', { variation: 2 }, { turn: true })), ['spin.1']),
  n('spin.3', 1, 2, 'Strangler', 's', 'Spinners: +1 accuracy in the middle overs.', R(bowl('spin', { accuracy: 1 }, { phase: ['middle'] })), ['spin.1']),
  n('spin.4', 2, 0, 'Googly', 's', 'Wrist spinners: +1 variation.', R(bowl('wrist', { variation: 1 })), ['spin.2']),
  n('spin.5', 2, 1, 'Flight', 'n', 'Spinners against a new batsman: +1 variation.', R(bowl('spin', { variation: 1 }, { newBat: true })), ['spin.2', 'spin.3']),
  n('spin.6', 2, 2, 'Powerplay spinner', 's', 'Spinners in the powerplay: +1 accuracy.', R(bowl('spin', { accuracy: 1 }, { phase: ['powerplay'] })), ['spin.3']),
  n('spin.7', 3, 1, 'Patience', 'n', 'Spinners: +1 stamina and +1 accuracy.', R(bowl('spin', { stamina: 1, accuracy: 1 })), ['spin.5']),
  n('spin.8', 4, 1, 'Left-arm wizard', 's', 'Left-arm bowlers: +1 variation.', R(bowl('leftarm', { variation: 1 })), ['spin.7']),
  n('spin.9', 5, 1, 'Web of spin', 'k', 'Spinners: +3 variation against a new batsman, but -2 against a set one.', R(bowl('spin', { variation: 3 }, { newBat: true }), bowl('spin', { variation: -2 }, { set: true })), ['spin.5']),
  // ---- Gloves and field
  n('keep.1', 0, 1, 'Safe hands', 's', 'Your team\'s fielding: +1.', { field: 1 }),
  n('keep.2', 1, 0, 'Stumper', 'n', 'Your team\'s fielding: +1.', { field: 1 }, ['keep.1'], 'The game rolls catches, run outs and stumpings together as fielding, so this lifts all of them.'),
  n('keep.3', 1, 2, 'Run-out hawk', 's', 'Your team\'s fielding: +1.', { field: 1 }, ['keep.1']),
  n('keep.4', 2, 0, 'Catching lessons', 's', 'Your team\'s fielding: +1.', { field: 1 }, ['keep.2']),
  n('keep.5', 2, 1, 'Boundary rider', 'n', 'Your team\'s fielding: +1.5.', { field: 1.5 }, ['keep.2', 'keep.3']),
  n('keep.6', 2, 2, 'Electric', 's', 'Your team\'s fielding: +1.', { field: 1 }, ['keep.3']),
  n('keep.7', 3, 1, 'Slip cordon', 'n', 'Your team\'s fielding: +1.5.', { field: 1.5 }, ['keep.5']),
  n('keep.8', 4, 1, 'Reflexes', 's', 'Your team\'s fielding: +1.', { field: 1 }, ['keep.7']),
  n('keep.9', 5, 1, 'Iron gloves', 'k', 'Your team\'s fielding: +3, but your keeper bats -2 on technique and power.', { field: 3, rules: [bat('keeper', { technique: -2, power: -2 })] }, ['keep.4', 'keep.7'], 'He almost never drops anything but scores less.'),
  // ---- Captain
  n('capt.1', 0, 1, 'Born leader', 's', 'The captain: +1 temperament.', R(bat('captain', { temperament: 1 }))),
  n('capt.2', 1, 0, 'Sharp reviews', 'n', 'Your reviews succeed 5 points more often.', { review: 0.05 }, ['capt.1'], 'Changes review results by a few per cent.'),
  n('capt.3', 1, 2, 'Reads the pitch', 's', 'Your batsmen: +1 technique on a pitch that seams or turns.', R(bat('any', { technique: 1 }, { seam: true }), bat('any', { technique: 1 }, { turn: true })), ['capt.1']),
  n('capt.4', 2, 0, 'Tactician', 's', 'Every bowler: +1 accuracy.', R(bowl('any', { accuracy: 1 })), ['capt.2']),
  n('capt.5', 2, 1, 'Leading by example', 'n', 'The captain: +1 technique and power with the bat, +1 accuracy and variation with the ball.', R(bat('captain', { technique: 1, power: 1 }), bowl('captain', { accuracy: 1, variation: 1 })), ['capt.2', 'capt.3']),
  n('capt.6', 2, 2, 'Calm under fire', 's', 'Your batsmen: +1 temperament while the captain plays.', R(bat('any', { temperament: 1 }, { needsCaptain: true })), ['capt.3']),
  n('capt.7', 3, 1, 'Inspiring', 'n', 'Your whole team: +1 to every rating while the captain plays.', R(bat('any', { all: 1 }, { needsCaptain: true }), bowl('any', { all: 1 }, { needsCaptain: true })), ['capt.5']),
  n('capt.8', 4, 1, 'Big-match captain', 's', 'Finals and knock-outs: the captain +2 temperament.', R(bat('captain', { temperament: 2 }, { big: true })), ['capt.7']),
  n('capt.9', 5, 1, 'The general', 'k', 'Your whole team: +1 to every rating while the captain plays, but the captain bats -1 technique.', R(bat('any', { all: 1 }, { needsCaptain: true }), bowl('any', { all: 1 }, { needsCaptain: true }), bat('captain', { technique: -1 })), ['capt.7'], 'The weight of leadership.'),
  // ---- Rookies: academy youth and players who have just joined
  n('new.1', 0, 1, 'Fresh legs', 's', 'Academy youth: train 10% faster with the coach.', K({ trainRookie: 0.1 })),
  n('new.2', 1, 0, 'Quick learners', 'n', 'Academy youth: match gains are 25% bigger.', K({ matchRookie: 0.25 }), ['new.1']),
  n('new.3', 1, 2, 'Settling in', 's', 'A new signing plays his first 5 matches with +1 to every rating.', R(bat('settling', { all: 1 }), bowl('settling', { all: 1 })), ['new.1'], 'Counts matches since he joined.'),
  n('new.4', 2, 0, 'Raw talent', 's', 'Scouting trips find prodigies a little more often (+3%).', K({ scoutProdigy: 3 }), ['new.2']),
  n('new.5', 2, 1, 'Mentor', 'n', 'Academy youth in your XI: +1 temperament while a veteran plays too.', R(bat('rookie', { temperament: 1 }, { needsVet: true })), ['new.2', 'new.3'], 'Needs a veteran (in the last two seasons of his career) and a youth in the same XI.'),
  n('new.6', 2, 2, 'Debut fire', 's', 'A player in his first match for you: +2 power and accuracy.', R(bat('debut', { power: 2 }), bowl('debut', { accuracy: 2 })), ['new.3']),
  n('new.7', 3, 1, 'Bright future', 'n', 'Academy youth in your XI: +1 technique.', R(bat('rookie', { technique: 1 })), ['new.5']),
  n('new.8', 4, 1, 'Cheap starts', 's', 'Young talents in the unsigned pool cost 15% less.', K({ youthCost: -0.15 }), ['new.7']),
  n('new.9', 5, 1, 'Golden generation', 'k', 'Academy youth: train twice as fast and gain 50% more in matches, but cost 30% more to sign.', K({ trainRookie: 1, matchRookie: 0.5, youthCost: 0.3 }), ['new.5'], 'A big boost for a youth-heavy team.'),
  // ---- Veterans: players in the last two seasons of their career
  n('vet.1', 0, 1, 'Experience', 's', 'Veterans: +1 temperament, and +1 accuracy with the ball.', R(bat('vet', { temperament: 1 }), bowl('vet', { accuracy: 1 }))),
  n('vet.2', 1, 0, 'Evergreen', 'n', 'Veterans lose one point less in each rating at the turn of the year.', K({ vetFade: 1 }), ['vet.1'], 'Softens the yearly slowdown of players in the last two seasons.'),
  n('vet.3', 1, 2, 'Big-match temperament', 's', 'Finals and knock-outs: veterans +1 temperament and accuracy.', R(bat('vet', { temperament: 1 }, { big: true }), bowl('vet', { accuracy: 1 }, { big: true })), ['vet.1']),
  n('vet.4', 2, 0, 'One more year', 's', 'A retiring veteran asks 20% less to stay on.', K({ extendCost: -0.2 }), ['vet.2']),
  n('vet.5', 2, 1, 'Wise head', 'n', 'Veterans under pressure: +1 technique and temperament.', R(bat('vet', { technique: 1, temperament: 1 }, { pressure: true })), ['vet.2', 'vet.3']),
  n('vet.6', 2, 2, 'Seen it all', 's', 'Veterans bowling in the second innings: +1 accuracy.', R(bowl('vet', { accuracy: 1 }, { inn: 'chase' })), ['vet.3']),
  n('vet.7', 3, 1, 'Old school', 'n', 'Veterans: +1 technique and power.', R(bat('vet', { technique: 1, power: 1 })), ['vet.5']),
  n('vet.8', 4, 1, 'Fit for life', 's', 'Veterans: +1 running, and +1 stamina with the ball.', R(bat('vet', { running: 1 }), bowl('vet', { stamina: 1 })), ['vet.7']),
  n('vet.9', 5, 1, 'Living legend', 'k', 'Your oldest player in the XI: +2 to every rating, but -4 running.', R(bat('oldest', { all: 2, running: -4 }), bowl('oldest', { all: 2 })), ['vet.5'], 'Great, but he cannot run.'),
  // ---- Club and money
  n('club.1', 0, 1, 'Frugal', 's', 'Buildings cost 5% less.', K({ build: -0.05 })),
  n('club.2', 1, 0, 'Sharp scouts', 'n', 'Scouting trips cost 20% less and find prodigies a little more often (+4%).', K({ scoutCost: -0.2, scoutProdigy: 4 }), ['club.1']),
  n('club.3', 1, 2, 'Good hands', 's', 'Training camps flop less and break through more.', K({ campLuck: 1 }), ['club.1']),
  n('club.4', 2, 0, 'Bigger academy', 's', 'The academy sets aside one more prospect (needs a youth academy).', K({ academy: 1 }), ['club.2']),
  n('club.5', 2, 1, 'Sponsors', 'n', 'Year-end earnings +5%.', K({ income: 0.05 }), ['club.2', 'club.3']),
  n('club.6', 2, 2, 'Patient lessons', 's', 'Lessons go badly less often.', K({ lessonLuck: 1 }), ['club.3']),
  n('club.7', 3, 1, 'Physio team', 'n', 'One more physio place on the squad page.', K({ physio: 1 }), ['club.5']),
  n('club.8', 4, 1, 'Negotiator', 's', 'Releasing a player pays 75% back instead of 70%.', K({ refund: 0.05 }), ['club.7']),
  n('club.9', 5, 1, 'Moneyball', 'k', 'Wages -10%, but you cannot build a stadium.', K({ wages: -0.1, noStadium: 1 }), ['club.5'], 'More coins, less pride.'),
  // ---- Matchday
  n('day.1', 0, 1, 'Home comforts', 's', 'Home games: every rating +1.', R(bat('any', { all: 1 }, { home: true }), bowl('any', { all: 1 }, { home: true }))),
  n('day.2', 1, 0, 'Winning habit', 'n', 'After 3 wins in a row: every rating +1.', R(bat('any', { all: 1 }, { streak: true }), bowl('any', { all: 1 }, { streak: true })), ['day.1']),
  n('day.3', 1, 2, 'Fast starters', 's', 'Powerplay: every rating +1.', R(bat('any', { all: 1 }, { phase: ['powerplay'] }), bowl('any', { all: 1 }, { phase: ['powerplay'] })), ['day.1']),
  n('day.4', 2, 0, 'Strong boost', 's', 'Boost tokens are 10% stronger (1.6 times).', K({ boost: 0.1 }), ['day.2']),
  n('day.5', 2, 1, 'Last-over nerves', 'n', 'Batsmen in the death overs: +1 temperament.', R(bat('any', { temperament: 1 }, { phase: ['death'] })), ['day.2', 'day.3']),
  n('day.6', 2, 2, 'Fitness', 's', 'Every bowler: +1 stamina.', R(bowl('any', { stamina: 1 })), ['day.3']),
  n('day.7', 3, 1, 'Crowd favourite', 'n', 'Home games: every rating +1 more.', R(bat('any', { all: 1 }, { home: true }), bowl('any', { all: 1 }, { home: true })), ['day.5']),
  n('day.8', 4, 1, 'Ice cold', 's', 'Chasing in the death overs: +1 temperament.', R(bat('any', { temperament: 1 }, { inn: 'chase', phase: ['death'] })), ['day.7']),
  n('day.9', 5, 1, 'All in', 'k', 'Boost tokens are 40% stronger (1.9 times), but bought tokens cost double.', K({ boost: 0.4, boostPrice: 1 }), ['day.5'], 'A token wins you a match, if you can afford it.'),
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
