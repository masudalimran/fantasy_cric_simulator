import type { BallEvent } from '../engine/types'
import { PLAYER_MOVES } from './playerMoves'

/**
 * Signature moves: the special attack a team (or a star) shows on a six, a strong four or a wicket. Drawn in code from a few shapes (no pictures, no
 * sounds to download) and for show only: the ball, the runs and the result are the same with or without them.
 */
export type MoveStyle = 'beam' | 'sphere' | 'slash' | 'lightning' | 'flame' | 'rune' | 'rush' | 'pulse'

export interface Move {
  /** What is shouted on screen. */
  name: string
  style: MoveStyle
  /** The outer glow and the bright middle of the effect. */
  c1: string
  c2: string
}

const m = (name: string, style: MoveStyle, c1: string, c2: string): Move => ({ name, style, c1, c2 })

/** One move for each team (by team id), shown when nobody on it has a move of his own. */
export const TEAM_MOVES: Record<string, Move> = {
  dragonball: m('KAMEHAMEHA!', 'beam', '#38bdf8', '#e0f2fe'),
  naruto: m('RASENGAN!', 'sphere', '#38bdf8', '#e0f2fe'),
  bleach: m('GETSUGA TENSHO!', 'slash', '#111827', '#ef4444'),
  onepiece: m('GOMU GOMU!', 'rush', '#ef4444', '#fde047'),
  aot: m('THUNDER SLASH!', 'slash', '#cbd5e1', '#4ade80'),
  mha: m('PLUS ULTRA!', 'rush', '#22c55e', '#fde047'),
  demonslayer: m('WATER BREATHING!', 'slash', '#38bdf8', '#e0f2fe'),
  jjk: m('CURSED ENERGY!', 'sphere', '#7c3aed', '#c4b5fd'),
  fma: m('TRANSMUTATION!', 'lightning', '#60a5fa', '#fde047'),
  jojo: m('ORA ORA ORA!', 'rush', '#a855f7', '#facc15'),
  yugioh: m('BURST STREAM!', 'beam', '#e0f2fe', '#60a5fa'),
  sds: m('SACRED TREASURE!', 'slash', '#f59e0b', '#fef3c7'),
  inuyasha: m('WIND SCAR!', 'slash', '#fbbf24', '#fffbeb'),
  witcher: m('IGNI!', 'flame', '#f97316', '#fde047'),
  dragonage: m('FIREBALL!', 'flame', '#ef4444', '#fde047'),
  dota: m('ULTIMATE!', 'pulse', '#22c55e', '#bbf7d0'),
  poe: m('CRITICAL STRIKE!', 'pulse', '#f59e0b', '#fff7ed'),
  finalfantasy: m('LIMIT BREAK!', 'rune', '#60a5fa', '#e0f2fe'),
  elderscrolls: m('FUS RO DAH!', 'pulse', '#7dd3fc', '#ffffff'),
  assassinscreed: m('HIDDEN BLADE!', 'slash', '#e5e7eb', '#ef4444'),
  zelda: m('SWORD BEAM!', 'beam', '#2dd4bf', '#ecfeff'),
  masseffect: m('BIOTIC SHOCKWAVE!', 'pulse', '#38bdf8', '#e0f2fe'),
  overwatch: m('ULTIMATE READY!', 'pulse', '#fb923c', '#ffedd5'),
  halo: m('ENERGY SWORD!', 'slash', '#22d3ee', '#ecfeff'),
}

/** Stars with a hand-picked move (by player id); they win over the generated ones in `playerMoves.ts`. */
const HAND_MOVES: Record<string, Move> = {
  'dragonball-son-goku': m('KAMEHAMEHA!', 'beam', '#38bdf8', '#e0f2fe'),
  'dragonball-vegeta': m('FINAL FLASH!', 'beam', '#facc15', '#fffbeb'),
  'dragonball-son-gohan': m('MASENKO!', 'beam', '#fb923c', '#fef3c7'),
  'dragonball-piccolo': m('SPECIAL BEAM CANNON!', 'beam', '#a855f7', '#f5d0fe'),
  'dragonball-frieza': m('DEATH BEAM!', 'beam', '#f472b6', '#fdf2f8'),
  'dragonball-beerus': m('HAKAI!', 'sphere', '#a855f7', '#f5d0fe'),
  'dragonball-krillin': m('DESTRUCTO DISC!', 'slash', '#fde047', '#fffbeb'),
  'dragonball-tien-shinhan': m('TRI-BEAM!', 'beam', '#fde047', '#ffffff'),
  'naruto-sasuke-uchiha': m('CHIDORI!', 'lightning', '#818cf8', '#e0e7ff'),
  'naruto-kakashi-hatake': m('RAIKIRI!', 'lightning', '#60a5fa', '#ffffff'),
  'naruto-itachi-uchiha': m('AMATERASU!', 'flame', '#111827', '#a78bfa'),
  'naruto-madara-uchiha': m('SUSANOO!', 'rune', '#a855f7', '#e9d5ff'),
  'naruto-might-guy': m('EIGHT GATES!', 'rush', '#22c55e', '#bbf7d0'),
  'bleach-ichigo-kurosaki': m('GETSUGA TENSHO!', 'slash', '#111827', '#ef4444'),
  'bleach-byakuya-kuchiki': m('SENBONZAKURA!', 'slash', '#f9a8d4', '#fdf2f8'),
  'bleach-toshiro-hitsugaya': m('HYORINMARU!', 'beam', '#7dd3fc', '#f0f9ff'),
  'bleach-genryusai-yamamoto': m('RYUJIN JAKKA!', 'flame', '#ef4444', '#fde047'),
  'bleach-kenpachi-zaraki': m('REIATSU SMASH!', 'rush', '#f8fafc', '#ef4444'),
  'onepiece-monkey-d-luffy': m('GUM-GUM PISTOL!', 'rush', '#ef4444', '#fde047'),
  'onepiece-roronoa-zoro': m('ONI GIRI!', 'slash', '#4ade80', '#ecfccb'),
  'onepiece-sanji': m('DIABLE JAMBE!', 'flame', '#f97316', '#fde047'),
  'onepiece-portgas-d-ace': m('FIRE FIST!', 'flame', '#f97316', '#fde047'),
  'onepiece-dracule-mihawk': m('BLACK BLADE!', 'slash', '#111827', '#e5e7eb'),
  'onepiece-edward-newgate': m('QUAKE!', 'pulse', '#e0f2fe', '#ffffff'),
  'mha-katsuki-bakugo': m('HOWITZER IMPACT!', 'flame', '#f97316', '#fde047'),
  'mha-shoto-todoroki': m('HEAT AND FROST!', 'sphere', '#38bdf8', '#fb923c'),
  'mha-endeavor': m('PROMINENCE BURN!', 'flame', '#ef4444', '#fde047'),
  'mha-izuku-midoriya': m('DETROIT SMASH!', 'rush', '#22c55e', '#bbf7d0'),
  'mha-all-might': m('UNITED STATES OF SMASH!', 'rush', '#fde047', '#ffffff'),
  'demonslayer-kyojuro-rengoku': m('UNKNOWING FIRE!', 'flame', '#f97316', '#fde047'),
  'demonslayer-zenitsu-agatsuma': m('THUNDERCLAP AND FLASH!', 'lightning', '#fde047', '#ffffff'),
  'demonslayer-tanjiro-kamado': m('HINOKAMI KAGURA!', 'flame', '#ef4444', '#fde047'),
  'jjk-satoru-gojo': m('HOLLOW PURPLE!', 'beam', '#a855f7', '#e9d5ff'),
  'jjk-ryomen-sukuna': m('DISMANTLE!', 'slash', '#ef4444', '#fecaca'),
  'jjk-yuji-itadori': m('BLACK FLASH!', 'lightning', '#111827', '#ef4444'),
  'fma-roy-mustang': m('FLAME ALCHEMY!', 'flame', '#f97316', '#fde047'),
  'jojo-jotaro-kujo': m('STAR PLATINUM: ORA!', 'rush', '#a855f7', '#facc15'),
  'jojo-dio-brando': m('THE WORLD: MUDA!', 'rush', '#facc15', '#ffffff'),
  'jojo-giorno-giovanna': m('GOLD EXPERIENCE!', 'rush', '#fbbf24', '#fffbeb'),
  'jojo-josuke-higashikata': m('CRAZY DIAMOND: DORA!', 'rush', '#f472b6', '#fdf2f8'),
  'yugioh-seto-kaiba': m('BLUE-EYES BURST STREAM!', 'beam', '#e0f2fe', '#60a5fa'),
  'yugioh-yugi-muto': m('DARK MAGIC ATTACK!', 'beam', '#a855f7', '#f5d0fe'),
  'yugioh-joey-wheeler': m('RED-EYES FLAME!', 'flame', '#ef4444', '#fde047'),
  'sds-meliodas': m('HELL BLAZE!', 'flame', '#111827', '#ef4444'),
  'sds-escanor': m('SUNSHINE!', 'flame', '#fde047', '#ffffff'),
  'inuyasha-sesshomaru': m('DRAGON STRIKE!', 'lightning', '#4ade80', '#ecfccb'),
  'inuyasha-kagome-higurashi': m('SACRED ARROW!', 'beam', '#f9a8d4', '#ffffff'),
  'witcher-geralt-of-rivia': m('AARD!', 'pulse', '#60a5fa', '#e0f2fe'),
  'witcher-yennefer-of-vengerberg': m('CHAIN LIGHTNING!', 'lightning', '#a855f7', '#f5d0fe'),
  'dota-invoker': m('SUN STRIKE!', 'beam', '#fde047', '#ffffff'),
  'dota-zeus': m('THUNDERGOD\'S WRATH!', 'lightning', '#60a5fa', '#ffffff'),
  'dota-lina': m('LAGUNA BLADE!', 'beam', '#ef4444', '#fde047'),
  'dota-juggernaut': m('BLADE FURY!', 'slash', '#e5e7eb', '#22c55e'),
  'finalfantasy-cloud-strife': m('OMNISLASH!', 'slash', '#60a5fa', '#e0f2fe'),
  'finalfantasy-sephiroth': m('SUPERNOVA!', 'sphere', '#ef4444', '#fde047'),
  'finalfantasy-squall-leonhart': m('LION HEART!', 'slash', '#e0f2fe', '#60a5fa'),
  'elderscrolls-dovahkiin': m('FUS RO DAH!', 'pulse', '#7dd3fc', '#ffffff'),
  'elderscrolls-alduin': m('DRAGONFIRE!', 'flame', '#ef4444', '#fde047'),
  'aot-levi-ackerman': m('SPINNING SLASH!', 'slash', '#e5e7eb', '#38bdf8'),
}

/** Every player's own move: the hand-picked ones first, then a move written for each of the other players in the built-in squads. */
export const STAR_MOVES: Record<string, Move> = { ...PLAYER_MOVES, ...HAND_MOVES }

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }

/** The move a player shows: his own if he has one, otherwise his team's. Nothing for a team with none (a custom team). */
export function moveFor(playerId: string, team: { id: string }): Move | null {
  return STAR_MOVES[playerId] ?? TEAM_MOVES[team.id] ?? null
}

/** A four that deserves its move: a hard, attacking one, and then only some of them so the moves stay special. */
export const isStrongFour = (ev: Pick<BallEvent, 'seq' | 'boundary' | 'intent'>) => ev.boundary === 4 && ev.intent >= 0.5 && hash01(ev.seq * 4.1) < 0.7

/** The six that is big enough for the full-screen cut-in: a long one, or one that brings up a fifty or hundred. */
export const isBigSix = (ev: Pick<BallEvent, 'boundary' | 'distance' | 'tags'>) => ev.boundary === 6 && ((ev.distance ?? 0) >= 90 || ev.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200'))

export interface MoveShow {
  move: Move
  /** Who made it: the batsman off the bat, or the bowling side on a wicket. */
  by: 'bat' | 'bowl'
  /** 1 is a six; smaller for a four. */
  size: number
}

/** The move to show on a ball, if any: a six always, a strong four sometimes, a bowler's wicket (but not a run out). */
export function moveForBall(
  ev: Pick<BallEvent, 'seq' | 'boundary' | 'intent' | 'wicket' | 'extraType'>,
  striker: { id: string }, battingTeam: { id: string }, bowler: { id: string }, bowlingTeam: { id: string },
): MoveShow | null {
  if (ev.wicket) {
    if (ev.wicket.kind === 'run out') return null
    const mv = moveFor(bowler.id, bowlingTeam)
    return mv ? { move: mv, by: 'bowl', size: 0.8 } : null
  }
  if (ev.extraType === 'wide' || ev.extraType === 'bye' || ev.extraType === 'legbye') return null
  if (ev.boundary === 6) { const mv = moveFor(striker.id, battingTeam); return mv ? { move: mv, by: 'bat', size: 1 } : null }
  if (isStrongFour(ev)) { const mv = moveFor(striker.id, battingTeam); return mv ? { move: mv, by: 'bat', size: 0.6 } : null }
  return null
}
