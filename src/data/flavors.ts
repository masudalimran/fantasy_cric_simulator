/**
 * The way a team's batsmen carry themselves at the crease, from where the team comes from: a swordsman holds the bat like a sword, a fighter plants his
 * feet wide, a ninja crouches, a mage leans on his bat like a staff. Looks only (see `bodyPose.ts`): the same ball and the same result whatever he is drawn doing.
 */
export type Flavor = 'plain' | 'samurai' | 'fighter' | 'ninja' | 'mage' | 'hero'

/** By team id. A team that is not listed (a custom team, a youth side) has the plain stance. */
export const TEAM_FLAVOR: Record<string, Flavor> = {
  bleach: 'samurai', demonslayer: 'samurai', inuyasha: 'samurai', onepiece: 'samurai', aot: 'samurai',
  dragonball: 'fighter', mha: 'fighter', jjk: 'fighter', jojo: 'fighter',
  naruto: 'ninja', assassinscreed: 'ninja', dota: 'ninja', poe: 'ninja',
  fma: 'mage', yugioh: 'mage', finalfantasy: 'mage', dragonage: 'mage', sds: 'mage', witcher: 'mage', elderscrolls: 'mage',
  zelda: 'hero', masseffect: 'hero', overwatch: 'hero', halo: 'hero',
}

export const flavorOfTeam = (teamId: string): Flavor => TEAM_FLAVOR[teamId] ?? 'plain'
