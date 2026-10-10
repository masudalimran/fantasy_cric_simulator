import type { Team } from '../../types'
import { aot, bleach, dragonball, naruto, onepiece } from './animeA'
import { demonslayer, fma, jjk, mha } from './animeB'
import { dota, dragonage, finalfantasy, poe, witcher } from './gamesA'
import { assassinscreed, elderscrolls, halo, masseffect, overwatch, zelda } from './gamesB'

export const BUILT_IN_TEAMS: Team[] = [
  bleach, naruto, dragonball, onepiece, aot, mha, demonslayer, jjk, fma,
  witcher, dragonage, dota, poe, finalfantasy, elderscrolls, assassinscreed, zelda, masseffect, overwatch, halo,
]
