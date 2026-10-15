import type { AwardCandidate } from '../engine/awards'

/** What the Man of the Match says to the camera, by what he did. Picked by a number so the same match always gives the same line. */
type Kind = 'bigbat' | 'bat' | 'bigbowl' | 'bowl' | 'field' | 'win'

const QUOTES: Record<Kind, string[]> = {
  bigbat: [
    'I just saw the ball and trusted my training. Today everything clicked.',
    'The team believed in me. I could not let them down.',
    'Every shot felt like it had a name on it. What a day!',
    'I told myself to stay in until the end. It worked out.',
    'Hard work pays off. I will celebrate with a big meal tonight!',
  ],
  bat: [
    'It was not easy out there, so every run counted.',
    'My partner kept me calm. We built it together.',
    'I wanted to give the team a platform, and I think we did.',
    'The pitch asked questions and we answered them.',
  ],
  bigbowl: [
    'The plan was simple: hit the spot and wait for the mistake.',
    'My captain gave me the ball at the right time. I just did my job.',
    'Those wickets belong to the whole team. The fielders were brilliant.',
    'I have been working on this delivery for months. Finally!',
  ],
  bowl: [
    'Tight lines and a bit of luck. That is bowling.',
    'I tried to make every ball count, and it did.',
    'The fielders made it easy for me today.',
  ],
  field: [
    'Catches win matches, and today we held on to everything.',
    'I was ready for it the whole time. It was just waiting for me.',
    'Fielding is where I fight for the team when my bat is quiet.',
  ],
  win: [
    'This was a team effort from the first ball to the last.',
    'We stuck to our plan and it paid off.',
    'Everyone chipped in. I am just lucky they picked me.',
  ],
}

export function quoteKind(c: AwardCandidate): Kind {
  if (c.bat && c.bat.runs >= 50) return 'bigbat'
  if (c.bowl && c.bowl.wickets >= 3) return 'bigbowl'
  if (c.bat && c.bat.runs >= 25 && c.parts.bat >= c.parts.bowl) return 'bat'
  if (c.bowl && c.bowl.wickets >= 1) return 'bowl'
  if (c.field.catches + c.field.stumpings + c.field.runOuts >= 2) return 'field'
  return c.bat && c.bat.runs >= 10 ? 'bat' : 'win'
}

export function quoteFor(c: AwardCandidate, seed: number): string {
  const pool = QUOTES[quoteKind(c)]
  let h = seed >>> 0
  for (let i = 0; i < c.id.length; i++) h = Math.imul(h ^ c.id.charCodeAt(i), 0x45d9f3b) >>> 0
  return pool[h % pool.length]
}
