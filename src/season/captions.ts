/**
 * The words the commentary box puts on the screens that only break up the game: what the cheerleaders, the crowd, the huddle and the
 * rest are doing, said the way a commentator would say it. Several ways of saying each, picked from a seed so a match does not repeat itself.
 */
export type CaptionKind =
  | 'cheer-boundary' | 'cheer-wicket' | 'stands-batting' | 'stands-bowling' | 'huddle' | 'wave' | 'fancam-happy' | 'fancam-shock'
  | 'blimp' | 'fireworks' | 'lights' | 'wagon' | 'worm' | 'manhattan' | 'scoring'

export interface CaptionCtx { team: string; other?: string; player?: string; extra?: string }

const BANK: Record<CaptionKind, string[]> = {
  'cheer-boundary': [
    'The {team} cheerleaders are over the moon for {player}!',
    'That boundary from {player} has the {team} cheer squad dancing!',
    'Pom-poms flying: {team} cheerleaders love what {player} just did!',
    'The {team} dance crew can barely keep up with {player}!',
    '{player} hits it, and the {team} cheerleaders are on their toes!',
    'Look at the {team} cheerleaders: that four has made their night!',
  ],
  'cheer-wicket': [
    'The {team} cheerleaders are in raptures over that wicket!',
    '{player} strikes, and the {team} cheer squad goes wild!',
    'Pom-poms everywhere! {team} cheerleaders adore that breakthrough!',
    'A wicket! The {team} dance squad is jumping for joy!',
    'The {team} cheerleaders could not be happier with {player} right now!',
  ],
  'stands-batting': [
    'The stadium is roaring for {team}!',
    '{team} supporters are on their feet and the noise is incredible!',
    'What an atmosphere: the whole stand is shaking for {team}!',
    'The fans are going berserk for {player}!',
    'You can hear the {team} fans from the car park!',
  ],
  'stands-bowling': [
    'The crowd are roaring after that big moment for {team}!',
    'The {team} fans erupt: they have just seen something special!',
    'Supporters up on their feet for {player}, and the ground is alive!',
    'The stands are rocking for {team} now!',
  ],
  huddle: [
    '{team} bring it in tight: a few words after that wicket.',
    'The {team} players huddle up, and the captain does the talking.',
    'A quiet team talk from {team}: they know this is the moment.',
    '{team} take a breath and regroup in a tight circle.',
    'Heads together in the {team} huddle. Plans are being made.',
  ],
  wave: [
    'The wave is rolling right around the stadium!',
    'Fans of {team} and {other} have joined in: the wave is going round!',
    'Both sets of supporters on their feet for the wave. Lovely stuff!',
    'The wave goes all the way around the ground, and nobody is sitting down!',
  ],
  'fancam-happy': [
    'This {team} supporter cannot believe how well it is going!',
    'One very happy {team} fan has found the camera!',
    'The {team} faithful are loving every minute of this!',
    'A fan in {team} colours is celebrating like he scored it himself!',
  ],
  'fancam-shock': [
    'This fan cannot believe what he just saw!',
    'Absolute disbelief in the crowd after that one!',
    'A {team} supporter has gone quiet. It has not gone their way.',
    'The shock on that supporter\'s face says it all!',
  ],
  blimp: [
    'A view from up above: the stadium is full and buzzing.',
    'The {team} blimp is up there cheering the side on!',
    'From the sky it looks like a sea of colour down there.',
    'Up above the ground, the {team} blimp is out to show support.',
  ],
  fireworks: [
    'Fireworks over the ground to celebrate {team}\'s {extra}!',
    'The night sky lights up for {team}!',
    'Boom! The fireworks are going off for {team}!',
    '{team} have raised their {extra}, and the ground is putting on a show!',
  ],
  lights: [
    'The floodlights are up as the chase begins.',
    'Under the lights now, and it is a different game after dark.',
    'The lights are on at the ground, and the atmosphere has changed.',
  ],
  wagon: [
    'From the stats desk: where {player} has scored his runs.',
    'The wagon wheel shows every scoring shot of {team}: off side, leg side, all around the ground.',
    'Stats desk here: look at the shape of the scoring. Where are the gaps?',
  ],
  worm: [
    'The worm: how the innings has moved, wicket by wicket.',
    'From the stats desk, the run chart of the innings so far.',
    'The worm tells the story: when it climbed, when it stalled.',
  ],
  manhattan: [
    'The over-by-over bars: who has won each over so far?',
    'Stats desk: the runs of every over, with the wickets marked.',
    'Look at those bars. The big overs jump right out.',
  ],
  scoring: [
    'The stats desk breaks down how {team} have scored their runs.',
    'Dots, singles, fours and sixes: how the runs have come.',
    'The scoring split: how much has come in boundaries?',
  ],
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** One caption for a screen: the same screen on the same ball always gets the same words. */
export function ambientCaption(kind: CaptionKind, ctx: CaptionCtx, seed: number): string {
  const list = BANK[kind]
  const text = list[(hash(`${kind}|${seed}`) + seed) % list.length]
  return text.replace(/\{(\w+)\}/g, (_, k) => (ctx as unknown as Record<string, string | undefined>)[k] ?? '').replace(/\s+/g, ' ').trim()
}

/** How many captions there are for a kind (for the tests). */
export const captionVariants = (kind: CaptionKind) => BANK[kind].length
