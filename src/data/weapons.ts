/**
 * Experiment: a character who fights with a weapon (or a power-up) in his series carries it instead of the cricket bat, and glows with his own aura. Looks only
 * (see `Body.tsx`): the weapon is drawn where the bat would be and is swung exactly like it, so a shot, the ball and the result are the same.
 */
export interface Weapon {
  kind: 'staff' | 'sword'
  /** The long part, its edge or trim, the handle and (for a sword) the guard. */
  blade: string
  edge: string
  handle: string
  guard?: string
  /** How thick the long part is, and how long the whole thing is (the bat is 36). */
  width: number
  length: number
}

/** The glow round a powered-up character: the colour of the flame and its bright middle. */
export interface Aura { c1: string; c2: string }

/** Dragon Ball first, to see how it fares. */
export const WEAPONS: Record<string, Weapon> = {
  'dragonball-son-goku': { kind: 'staff', blade: '#dc2626', edge: '#fbbf24', handle: '#fbbf24', width: 4.6, length: 46 }, // the Power Pole
  'dragonball-son-gohan': { kind: 'sword', blade: '#cbd5e1', edge: '#f8fafc', handle: '#7c2d12', guard: '#fbbf24', width: 5.4, length: 44 }, // the Z Sword
  'dragonball-trunks': { kind: 'sword', blade: '#e2e8f0', edge: '#ffffff', handle: '#312e81', guard: '#94a3b8', width: 3.8, length: 42 }, // his katana
  'dragonball-master-roshi': { kind: 'staff', blade: '#a16207', edge: '#78350f', handle: '#78350f', width: 4, length: 44 }, // the old turtle hermit's staff
}

export const AURAS: Record<string, Aura> = {
  'dragonball-son-goku': { c1: '#fde047', c2: '#fffbeb' },
  'dragonball-vegeta': { c1: '#38bdf8', c2: '#e0f2fe' },
  'dragonball-son-gohan': { c1: '#facc15', c2: '#ffffff' },
  'dragonball-piccolo': { c1: '#e5e7eb', c2: '#ffffff' },
  'dragonball-trunks': { c1: '#60a5fa', c2: '#dbeafe' },
  'dragonball-android-18': { c1: '#67e8f9', c2: '#ecfeff' },
  'dragonball-tien-shinhan': { c1: '#fde68a', c2: '#ffffff' },
  'dragonball-krillin': { c1: '#fb923c', c2: '#ffedd5' },
  'dragonball-frieza': { c1: '#a855f7', c2: '#f5d0fe' },
  'dragonball-beerus': { c1: '#c026d3', c2: '#fae8ff' },
  'dragonball-majin-buu': { c1: '#f472b6', c2: '#fdf2f8' },
  'dragonball-cell': { c1: '#84cc16', c2: '#ecfccb' },
  'dragonball-yamcha': { c1: '#f97316', c2: '#fed7aa' },
  'dragonball-master-roshi': { c1: '#ef4444', c2: '#fecaca' },
  'dragonball-hit': { c1: '#7c3aed', c2: '#ddd6fe' },
  'dragonball-android-17': { c1: '#22d3ee', c2: '#cffafe' },
}

export const weaponOf = (playerId: string): Weapon | null => WEAPONS[playerId] ?? null
export const auraOf = (playerId: string): Aura | null => AURAS[playerId] ?? null
