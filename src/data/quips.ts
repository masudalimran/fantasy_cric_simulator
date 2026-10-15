/** What the two commentators say in the Commentators' corner screen: a general line, or one that fits the chase. */
const GENERAL = [
  'Honestly, I have not seen a contest like this all season.',
  'The crowd is loving every ball of this!',
  'You can feel the tension from up here in the box.',
  'That is cricket for you: it is never over until it is over.',
  'The pitch is starting to show its character now.',
  'Both captains will be doing some serious thinking.',
  'I would not want to be a bowler on a day like this.',
  'This is the kind of game people tell their grandchildren about.',
  'Keep your eyes on the field changes, they tell a story.',
  'A little patience goes a long way out there.',
  'The fielders are working overtime, look at that energy!',
  'Somewhere a coach is very happy with that over.',
]
const CHASE_CLOSE = ['It is going to the wire, I can feel it!', 'Every single run counts now.', 'Tell me you are not on the edge of your seat.']
const CHASE_FAR = ['They will need something special from here.', 'A big over would change everything.', 'The required rate is climbing.']

export function quipFor(seq: number, chase: { need: number; balls: number } | null): string {
  let pool = GENERAL
  if (chase && chase.balls > 0 && chase.need > 0) pool = chase.need / chase.balls > 1.6 ? CHASE_FAR : chase.need / chase.balls < 1 ? CHASE_CLOSE : GENERAL
  return pool[Math.floor((Math.sin(seq * 12.9898) * 43758.5453 % 1 + 1) % 1 * pool.length) % pool.length]
}
