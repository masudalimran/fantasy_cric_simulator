import { STAR_MOVES, TEAM_MOVES } from './moves'

/**
 * What every character carries instead of the cricket bat: the weapon he fights with in his series, or a bat charged with his power, and the aura that
 * glows round him. Looks only (see `Body.tsx`): the weapon is drawn where the bat would be and is swung exactly like it, so the shot, the ball and the
 * result are the same. One row per character; a character not listed (a youth or custom player) keeps the plain bat and has no aura.
 */
export type Head = 'axe' | 'hammer' | 'spear' | 'scythe' | 'crescent' | 'orb' | 'flame' | 'crystal' | 'bolt' | 'gun'

export interface Weapon {
  /** A bat charged with power, a staff or pole, or a sword. */
  kind: 'bat' | 'staff' | 'sword'
  /** The long part, its edge or trim, the handle and (for a sword) the guard. */
  blade: string
  edge: string
  handle: string
  guard?: string
  /** How thick the long part is, and how long the whole thing is (the bat is 36). */
  width: number
  length: number
  /** A glow along the weapon (the power running through it). */
  glow?: string
  /** What sits on its tip: an axe head, a hammer, a glowing orb, a flame... */
  head?: { kind: Head; color: string; size: number }
}

/** The glow round a powered-up character: the colour of the flame and its bright middle. */
export interface Aura { c1: string; c2: string }

interface O { len?: number; w?: number; glow?: string; head?: Head; hc?: string; hs?: number; handle?: string; guard?: string }
const lighten = (hex: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const c = (v: number) => Math.round(v + (255 - v) * 0.6).toString(16).padStart(2, '0')
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}
const tip = (o: O, base: string) => (o.head ? { kind: o.head, color: o.hc ?? base, size: o.hs ?? 1 } : undefined)
/** A sword: blade colour, handle, guard. */
const sword = (blade: string, handle = '#78350f', guard = '#fbbf24', o: O = {}): Weapon => ({ kind: 'sword', blade, edge: lighten(blade), handle: o.handle ?? handle, guard: o.guard ?? guard, width: o.w ?? 4.6, length: o.len ?? 42, glow: o.glow, head: tip(o, blade) })
/** A thin katana. */
const katana = (blade = '#e2e8f0', handle = '#111827', o: O = {}): Weapon => sword(blade, handle, o.guard ?? '#fbbf24', { w: 3.4, len: 46, ...o })
/** A staff, pole or polearm: its shaft, its caps, and what is on top. */
const staff = (shaft: string, cap: string, o: O = {}): Weapon => ({ kind: 'staff', blade: shaft, edge: cap, handle: cap, guard: cap, width: o.w ?? 4.2, length: o.len ?? 44, glow: o.glow, head: tip(o, cap) })
/** A bat charged with the character's power. */
const bat = (color: string, glow?: string, o: O = {}): Weapon => ({ kind: 'bat', blade: color, edge: lighten(color), handle: o.handle ?? '#7c2d12', width: o.w ?? 8.5, length: o.len ?? 36, glow, head: tip(o, glow ?? color) })

const STEEL = '#cbd5e1', DARK = '#1f2937', GOLD = '#fbbf24', WOOD = '#a16207', RED = '#dc2626', BLUE = '#38bdf8', GREEN = '#22c55e', PURPLE = '#a855f7', PINK = '#f472b6', ORANGE = '#f97316', ICE = '#7dd3fc', TEAL = '#2dd4bf', BLACK = '#111827'

const TEAMS: Record<string, [string, Weapon][]> = {
  dragonball: [
    ['son-goku', staff(RED, GOLD, { w: 4.6, len: 46 })], // the Power Pole
    ['vegeta', bat('#1d4ed8', BLUE, { head: 'orb', hc: '#e0f2fe' })],
    ['son-gohan', sword('#cbd5e1', '#7c2d12', GOLD, { w: 5.4, len: 44 })], // the Z Sword
    ['piccolo', bat('#15803d', '#e5e7eb', { head: 'orb', hc: '#bbf7d0' })],
    ['trunks', sword('#e2e8f0', '#312e81', '#94a3b8', { w: 3.8, len: 44, glow: BLUE })],
    ['android-18', bat('#fde68a', '#67e8f9', { head: 'bolt', hc: '#ecfeff' })],
    ['tien-shinhan', bat('#fde68a', '#fde047', { head: 'orb', hc: '#ffffff' })],
    ['krillin', bat('#fb923c', ORANGE, { head: 'crescent', hc: '#fde047', hs: 1.3 })], // the Destructo Disc
    ['frieza', bat('#7c3aed', PURPLE, { head: 'spear', hc: '#f5d0fe' })],
    ['beerus', staff('#6d28d9', '#f5d0fe', { glow: '#c026d3', head: 'orb', hc: '#c026d3', hs: 1.2 })],
    ['majin-buu', bat('#f472b6', PINK, { head: 'orb', hc: '#fdf2f8', hs: 1.1 })],
    ['cell', bat('#4d7c0f', '#84cc16', { head: 'orb', hc: '#ecfccb' })],
    ['yamcha', bat('#f97316', ORANGE, { head: 'orb', hc: '#fed7aa' })],
    ['master-roshi', staff(WOOD, '#78350f', { w: 4, len: 44, glow: '#ef4444' })],
    ['hit', bat('#4c1d95', '#7c3aed', { head: 'crystal', hc: '#ddd6fe' })],
    ['android-17', bat('#0891b2', '#22d3ee', { head: 'bolt', hc: '#cffafe' })],
  ],
  naruto: [
    ['naruto-uzumaki', bat('#f97316', BLUE, { head: 'orb', hc: '#e0f2fe', hs: 1.3 })], // the Rasengan
    ['sasuke-uchiha', katana('#cbd5e1', '#1e1b4b', { glow: '#818cf8', len: 46 })], // Kusanagi and Chidori
    ['madara-uchiha', staff(DARK, RED, { head: 'crescent', hc: '#b91c1c', hs: 1.4, glow: '#a855f7' })], // the war fan
    ['kakashi-hatake', sword(STEEL, '#e5e7eb', '#94a3b8', { w: 3.4, len: 34, glow: '#60a5fa' })], // the white chakra blade
    ['minato-namikaze', sword('#fde047', '#7c2d12', GOLD, { w: 3.4, len: 32, glow: '#fde047' })], // the three-pronged kunai
    ['itachi-uchiha', bat('#1f2937', '#7c3aed', { head: 'flame', hc: '#111827' })], // Amaterasu
    ['shikamaru-nara', staff('#3f3f46', '#a78bfa', { head: 'orb', hc: '#312e81' })],
    ['jiraiya', staff('#7f1d1d', '#fbbf24', { head: 'orb', hc: '#ef4444', glow: '#fb923c' })],
    ['rock-lee', bat('#16a34a', '#86efac', { head: 'hammer', hc: '#22c55e', hs: 0.9 })],
    ['tsunade', bat('#fda4af', PINK, { head: 'hammer', hc: '#fb7185', hs: 1.2 })],
    ['choji-akimichi', bat('#ea580c', ORANGE, { head: 'hammer', hc: '#f97316', hs: 1.4 })],
    ['might-guy', bat('#15803d', '#4ade80', { head: 'hammer', hc: '#16a34a' })],
    ['gaara', bat('#d6a45c', '#d6a45c', { head: 'orb', hc: '#b45309', hs: 1.2 })], // the sand gourd
    ['neji-hyuga', bat('#e0e7ff', '#a5b4fc', { head: 'crescent', hc: '#c7d2fe' })],
    ['orochimaru', sword('#a3e635', '#3f6212', '#a855f7', { w: 4, len: 48, glow: '#84cc16' })], // Kusanagi
    ['hinata-hyuga', bat('#c4b5fd', '#818cf8', { head: 'crystal', hc: '#ddd6fe' })],
  ],
  bleach: [
    ['ichigo-kurosaki', sword('#e5e7eb', BLACK, BLACK, { w: 7, len: 50, glow: '#ef4444' })], // Zangetsu
    ['renji-abarai', sword('#94a3b8', '#7f1d1d', '#ef4444', { w: 4.6, len: 46, glow: '#ef4444', head: 'scythe', hc: '#ef4444' })], // Zabimaru
    ['sosuke-aizen', katana('#e2e8f0', '#4c1d95', { glow: '#a855f7' })],
    ['byakuya-kuchiki', katana('#f9a8d4', '#0f172a', { glow: PINK, len: 48 })], // Senbonzakura
    ['kenpachi-zaraki', sword('#94a3b8', '#451a03', '#9ca3af', { w: 8, len: 50, glow: '#e5e7eb' })],
    ['toshiro-hitsugaya', katana('#bae6fd', '#1e3a8a', { glow: ICE, len: 48 })], // Hyorinmaru
    ['yoruichi-shihoin', bat('#fbbf24', '#fde047', { head: 'bolt', hc: '#ffffff' })], // Shunko
    ['kisuke-urahara', staff('#1f2937', '#ef4444', { glow: '#ef4444', head: 'crescent', hc: '#dc2626', hs: 0.8 })], // the cane and Benihime
    ['mayuri-kurotsuchi', bat('#fde047', '#a855f7', { head: 'crystal', hc: '#a855f7' })],
    ['rukia-kuchiki', katana('#ffffff', '#e5e7eb', { glow: '#bae6fd', len: 46 })], // Sode no Shirayuki
    ['kon', bat('#facc15', '#22c55e', { head: 'orb', hc: '#bbf7d0' })],
    ['genryusai-yamamoto', staff(WOOD, '#7f1d1d', { glow: '#ef4444', head: 'flame', hc: '#fde047', hs: 1.3 })], // Ryujin Jakka
    ['uryu-ishida', bat('#38bdf8', '#e0f2fe', { head: 'crescent', hc: '#e0f2fe', hs: 1.2 })], // the Quincy bow
    ['yasutora-sado', bat('#7c2d12', '#ef4444', { head: 'hammer', hc: '#b45309', hs: 1.2 })], // the Brazo Derecha
    ['shunsui-kyoraku', katana('#cbd5e1', '#f9a8d4', { glow: PINK })],
    ['orihime-inoue', bat('#fda4af', '#fde047', { head: 'crystal', hc: '#fde68a' })], // the Shun Shun Rikka
  ],
  onepiece: [
    ['roronoa-zoro', sword('#bbf7d0', '#14532d', GOLD, { w: 4.4, len: 48, glow: '#4ade80' })], // Wado Ichimonji
    ['sanji', bat('#1f2937', ORANGE, { head: 'flame', hc: '#fde047' })], // Diable Jambe
    ['monkey-d-luffy', bat('#ef4444', '#fde047', { head: 'hammer', hc: '#fca5a5', hs: 1.4 })], // Gum-Gum
    ['shanks', sword('#e5e7eb', '#7f1d1d', GOLD, { w: 4.4, len: 46, glow: RED })], // Gryphon
    ['dracule-mihawk', sword('#e5e7eb', BLACK, '#e5e7eb', { w: 6, len: 52, glow: '#111827' })], // Yoru
    ['trafalgar-law', katana('#e2e8f0', '#0f766e', { glow: TEAL, len: 50, w: 4 })], // Kikoku
    ['usopp', bat('#a16207', GREEN, { head: 'orb', hc: '#86efac' })], // the Kabuto slingshot
    ['jinbe', bat('#1d4ed8', BLUE, { head: 'hammer', hc: '#38bdf8' })],
    ['nami', staff('#0ea5e9', '#fde047', { glow: '#fde047', head: 'bolt', hc: '#fef08a' })], // the Clima-Tact
    ['franky', bat('#64748b', '#22d3ee', { head: 'gun', hc: '#94a3b8' })],
    ['tony-tony-chopper', bat('#f9a8d4', PINK, { head: 'hammer', hc: '#fb7185', hs: 1.3 })], // Monster Point
    ['portgas-d-ace', bat('#f97316', '#fde047', { head: 'flame', hc: '#fde047', hs: 1.3 })], // the Mera Mera
    ['nico-robin', bat('#7c3aed', PURPLE, { head: 'crescent', hc: '#c4b5fd' })],
    ['edward-newgate', staff('#e5e7eb', '#94a3b8', { w: 5, len: 50, glow: '#e0f2fe', head: 'crescent', hc: '#f1f5f9', hs: 1.5 })], // the bisento
    ['brook', katana('#cbd5e1', '#111827', { glow: ICE })], // the cane sword
    ['buggy-the-clown', bat('#dc2626', '#fde047', { head: 'orb', hc: '#fecaca' })],
  ],
  aot: [
    ['levi-ackerman', sword('#e5e7eb', '#334155', '#94a3b8', { w: 3.4, len: 40, glow: BLUE })], // the ODM blades
    ['mikasa-ackerman', sword('#e5e7eb', '#334155', '#94a3b8', { w: 3.4, len: 42 })],
    ['eren-yeager', bat('#b45309', ORANGE, { head: 'flame', hc: '#fde047' })],
    ['erwin-smith', sword('#e5e7eb', '#1e3a8a', GOLD, { w: 4, len: 44 })],
    ['armin-arlert', bat('#fde68a', '#fb923c', { head: 'flame', hc: '#fef3c7', hs: 1.2 })], // the Colossal blast
    ['hange-zoe', staff('#fbbf24', '#78350f', { glow: '#fde047', head: 'spear', hc: '#fef9c3' })], // the thunder spear
    ['jean-kirstein', sword('#e5e7eb', '#334155', '#94a3b8', { w: 3.4, len: 42 })],
    ['reiner-braun', bat('#94a3b8', '#e2e8f0', { head: 'hammer', hc: '#cbd5e1' })],
    ['annie-leonhart', bat('#a5f3fc', ICE, { head: 'crystal', hc: '#cffafe' })],
    ['zeke-yeager', bat('#a16207', '#a16207', { head: 'orb', hc: '#b45309' })],
    ['connie-springer', sword('#e5e7eb', '#334155', '#94a3b8', { w: 3.4, len: 40 })],
    ['sasha-braus', bat('#a16207', '#f59e0b', { head: 'spear', hc: '#fde68a' })],
    ['historia-reiss', staff('#fde68a', GOLD, { glow: '#fde047', head: 'crystal', hc: '#fef08a' })],
    ['floch-forster', sword('#e5e7eb', '#7f1d1d', '#94a3b8', { w: 3.6, len: 40 })],
    ['porco-galliard', bat('#6b7280', '#94a3b8', { head: 'hammer', hc: '#9ca3af' })],
    ['kenny-ackerman', sword('#9ca3af', BLACK, '#6b7280', { w: 3.6, len: 36, glow: RED, head: 'gun', hc: '#374151' })],
  ],
  mha: [
    ['shoto-todoroki', { ...bat('#38bdf8', ORANGE), edge: '#fb923c' }], // fire and ice
    ['all-might', bat('#fde047', '#fef9c3', { head: 'hammer', hc: '#facc15', hs: 1.4 })],
    ['izuku-midoriya', bat('#16a34a', '#4ade80', { head: 'bolt', hc: '#bbf7d0' })], // One For All
    ['katsuki-bakugo', bat('#f97316', ORANGE, { head: 'flame', hc: '#fde047', hs: 1.2 })], // explosions
    ['endeavor', bat('#dc2626', '#fb923c', { head: 'flame', hc: '#fef08a', hs: 1.4 })],
    ['hawks', bat('#dc2626', '#fca5a5', { head: 'crescent', hc: '#ef4444' })],
    ['ochaco-uraraka', bat('#f9a8d4', PINK, { head: 'orb', hc: '#fdf2f8' })],
    ['momo-yaoyorozu', staff('#dc2626', '#fde047', { head: 'crystal', hc: '#fb7185' })],
    ['tenya-iida', bat('#2563eb', '#60a5fa', { head: 'bolt', hc: '#dbeafe' })],
    ['shota-aizawa', bat('#6b7280', '#9ca3af', { head: 'orb', hc: '#ef4444' })],
    ['tomura-shigaraki', bat('#475569', '#94a3b8', { head: 'crystal', hc: '#1f2937' })],
    ['eijiro-kirishima', bat('#b91c1c', '#ef4444', { head: 'hammer', hc: '#991b1b' })],
    ['mirio-togata', bat('#fbbf24', '#fef08a', { head: 'orb', hc: '#fffbeb' })],
    ['mirko', bat('#f1f5f9', '#ffffff', { head: 'crescent', hc: '#e2e8f0' })],
    ['dabi', bat('#1d4ed8', '#60a5fa', { head: 'flame', hc: '#93c5fd', hs: 1.3 })], // the blue flame
    ['mina-ashido', bat('#f472b6', '#f9a8d4', { head: 'orb', hc: '#fbcfe8' })],
  ],
  demonslayer: [
    ['tanjiro-kamado', katana('#111827', '#7f1d1d', { glow: '#f97316', len: 46, w: 4 })], // the black Nichirin
    ['zenitsu-agatsuma', katana('#fde047', '#78350f', { glow: '#facc15', len: 46 })],
    ['giyu-tomioka', katana('#38bdf8', '#14532d', { glow: BLUE, len: 46 })],
    ['kyojuro-rengoku', katana('#f97316', '#7f1d1d', { glow: '#ef4444', len: 47, w: 4.2 })],
    ['kokushibo', katana('#a78bfa', '#312e81', { glow: '#7c3aed', len: 50, w: 4 })],
    ['muichiro-tokito', katana('#cbd5e1', '#0f172a', { glow: ICE, len: 46 })],
    ['mitsuri-kanroji', katana('#f9a8d4', '#be185d', { glow: PINK, len: 48, w: 2.8 })], // the whip sword
    ['tengen-uzui', sword('#fbbf24', '#78350f', GOLD, { w: 5.4, len: 38, glow: '#f59e0b' })],
    ['shinobu-kocho', katana('#c4b5fd', '#4c1d95', { glow: PURPLE, len: 42, w: 2.4 })],
    ['sanemi-shinazugawa', katana('#86efac', '#14532d', { glow: GREEN })],
    ['genya-shinazugawa', staff('#374151', '#9ca3af', { head: 'gun', hc: '#4b5563' })],
    ['gyomei-himejima', staff('#78716c', '#a8a29e', { w: 5, glow: '#a8a29e', head: 'axe', hc: '#a8a29e', hs: 1.3 })],
    ['akaza', bat('#f472b6', '#a5f3fc', { head: 'orb', hc: '#fbcfe8' })],
    ['obanai-iguro', katana('#86efac', '#4d7c0f', { glow: '#4ade80', len: 44 })],
    ['kanao-tsuyuri', katana('#fbcfe8', '#9d174d', { glow: PINK })],
    ['inosuke-hashibira', sword('#5eead4', '#134e4a', '#0d9488', { w: 4.8, len: 40, glow: TEAL })],
  ],
  jjk: [
    ['kento-nanami', sword('#d6a45c', '#78350f', GOLD, { w: 6.4, len: 38 })], // the ratio blade
    ['toji-fushiguro', staff('#1f2937', '#e5e7eb', { head: 'spear', hc: '#e5e7eb', glow: '#6b7280' })], // the inverted spear
    ['satoru-gojo', bat('#1e3a8a', '#818cf8', { head: 'orb', hc: '#a855f7', hs: 1.4 })], // Hollow Purple
    ['ryomen-sukuna', sword('#450a0a', BLACK, '#ef4444', { w: 5.6, len: 44, glow: '#ef4444' })],
    ['yuta-okkotsu', katana('#f9a8d4', '#f8fafc', { glow: PINK, len: 46 })],
    ['maki-zenin', staff('#16a34a', '#e5e7eb', { head: 'spear', hc: '#dcfce7' })],
    ['yuji-itadori', bat('#111827', '#ef4444', { head: 'bolt', hc: '#ef4444' })], // Black Flash
    ['panda', bat('#f8fafc', '#1f2937', { head: 'hammer', hc: '#111827', hs: 1.2 })],
    ['megumi-fushiguro', bat('#1f2937', '#312e81', { head: 'orb', hc: '#0f172a' })],
    ['toge-inumaki', bat('#f1f5f9', '#e0f2fe', { head: 'orb', hc: '#ffffff' })],
    ['mahito', bat('#7c3aed', '#c4b5fd', { head: 'crystal', hc: '#a78bfa' })],
    ['nobara-kugisaki', staff('#7f1d1d', '#e5e7eb', { head: 'hammer', hc: '#6b7280', glow: '#fb7185' })],
    ['kinji-hakari', bat('#f472b6', '#fbbf24', { head: 'orb', hc: '#fde047' })],
    ['aoi-todo', bat('#78350f', '#a16207', { head: 'hammer', hc: '#92400e', hs: 1.3 })],
    ['suguru-geto', bat('#1f2937', '#7c3aed', { head: 'orb', hc: '#312e81', hs: 1.2 })],
    ['kenjaku', bat('#6d28d9', '#a855f7', { head: 'crystal', hc: '#4c1d95' })],
  ],
  fma: [
    ['roy-mustang', bat('#e5e7eb', ORANGE, { head: 'flame', hc: '#fde047', hs: 1.3 })], // the ignition gloves
    ['edward-elric', sword('#cbd5e1', '#7f1d1d', '#94a3b8', { w: 4.6, len: 38, glow: '#60a5fa' })], // the automail blade
    ['riza-hawkeye', staff('#1f2937', '#9ca3af', { head: 'gun', hc: '#374151' })],
    ['king-bradley', sword('#e5e7eb', BLACK, '#111827', { w: 3.4, len: 44 })],
    ['van-hohenheim', staff('#fbbf24', '#78350f', { glow: GOLD, head: 'crystal', hc: '#fecaca' })],
    ['alphonse-elric', bat('#94a3b8', '#60a5fa', { head: 'hammer', hc: '#cbd5e1', hs: 1.2 })],
    ['scar', bat('#dc2626', '#fca5a5', { head: 'bolt', hc: '#ef4444' })],
    ['izumi-curtis', bat('#cbd5e1', '#e2e8f0', { head: 'hammer', hc: '#94a3b8' })],
    ['envy', bat('#6d28d9', '#a855f7', { head: 'spear', hc: '#c4b5fd' })],
    ['greed', bat('#374151', '#111827', { head: 'crystal', hc: '#1f2937' })],
    ['maes-hughes', sword('#e5e7eb', '#334155', '#94a3b8', { w: 3, len: 30 })],
    ['olivier-armstrong', sword('#bae6fd', '#1e3a8a', ICE, { w: 4.4, len: 46, glow: ICE })],
    ['alex-louis-armstrong', bat('#f9a8d4', PINK, { head: 'hammer', hc: '#fb7185', hs: 1.5 })],
    ['lust', bat('#7c3aed', '#c4b5fd', { head: 'spear', hc: '#ddd6fe', hs: 1.3 })],
    ['winry-rockbell', staff('#94a3b8', '#f59e0b', { head: 'hammer', hc: '#cbd5e1', hs: 1 })], // her wrench
    ['father', bat('#1f2937', '#111827', { head: 'orb', hc: '#7f1d1d', hs: 1.3 })],
  ],
  jojo: [
    ['jotaro-kujo', bat('#7e22ce', '#a855f7', { head: 'hammer', hc: '#c084fc', hs: 1.3 })], // Star Platinum
    ['joseph-joestar', bat('#9333ea', '#facc15', { head: 'bolt', hc: '#fef08a' })], // hamon
    ['dio-brando', bat('#facc15', '#fde047', { head: 'crescent', hc: '#fef08a' })], // The World
    ['giorno-giovanna', bat('#fbbf24', '#fde68a', { head: 'crystal', hc: '#fffbeb' })],
    ['josuke-higashikata', bat('#f472b6', '#fbcfe8', { head: 'hammer', hc: '#f9a8d4' })],
    ['jolyne-kujo', bat('#14b8a6', '#5eead4', { head: 'orb', hc: '#ccfbf1' })],
    ['noriaki-kakyoin', bat('#22c55e', '#86efac', { head: 'crystal', hc: '#bbf7d0' })],
    ['jean-pierre-polnareff', sword('#e5e7eb', '#a16207', '#9ca3af', { w: 2.8, len: 44, glow: '#e2e8f0' })], // Silver Chariot's rapier
    ['bruno-bucciarati', bat('#fbbf24', '#fef08a', { head: 'hammer', hc: '#fde047' })],
    ['yoshikage-kira', bat('#f9a8d4', '#fb7185', { head: 'orb', hc: '#fecdd3' })],
    ['rohan-kishibe', staff('#1f2937', '#fbbf24', { head: 'crystal', hc: '#fde68a' })],
    ['jonathan-joestar', bat('#eab308', '#fde047', { head: 'bolt', hc: '#fef9c3' })],
    ['caesar-zeppeli', bat('#fda4af', '#fbcfe8', { head: 'orb', hc: '#ffe4e6' })],
    ['guido-mista', staff('#44403c', '#fbbf24', { head: 'gun', hc: '#57534e' })],
    ['narancia-ghirga', bat('#3b82f6', '#93c5fd', { head: 'spear', hc: '#bfdbfe' })],
    ['okuyasu-nijimura', bat('#6366f1', '#a5b4fc', { head: 'hammer', hc: '#818cf8' })],
  ],
  yugioh: [
    ['yugi-muto', staff('#7c3aed', GOLD, { head: 'crystal', hc: '#fde68a', glow: PURPLE })],
    ['atem', staff('#fbbf24', '#78350f', { glow: '#fde047', head: 'crystal', hc: '#fef08a' })], // the Millennium Puzzle
    ['seto-kaiba', staff('#e0f2fe', '#60a5fa', { head: 'spear', hc: '#f8fafc', glow: '#93c5fd' })], // Blue-Eyes
    ['joey-wheeler', bat('#dc2626', '#fb923c', { head: 'flame', hc: '#fde047' })], // Red-Eyes
    ['mai-valentine', bat('#a855f7', '#e9d5ff', { head: 'crescent', hc: '#f0abfc' })],
    ['marik-ishtar', staff('#fbbf24', '#78350f', { glow: '#fde047', head: 'crystal', hc: '#fcd34d' })], // the Millennium Rod
    ['tea-gardner', bat('#f472b6', '#fbcfe8', { head: 'orb', hc: '#fdf2f8' })],
    ['maximillion-pegasus', bat('#fde68a', GOLD, { head: 'crystal', hc: '#fbbf24' })],
    ['tristan-taylor', bat('#92400e', '#f59e0b', { head: 'hammer', hc: '#b45309' })],
    ['ryou-bakura', sword('#e5e7eb', '#78350f', GOLD, { w: 3.6, len: 36, glow: '#a78bfa' })],
    ['mokuba-kaiba', bat('#60a5fa', '#bfdbfe', { head: 'orb', hc: '#e0f2fe' })],
    ['duke-devlin', bat('#dc2626', '#fde68a', { head: 'crystal', hc: '#fef9c3' })],
    ['ishizu-ishtar', staff('#fbbf24', '#78350f', { glow: '#fde68a', head: 'crystal', hc: '#fef3c7' })],
    ['odion', staff('#78716c', '#a8a29e', { head: 'axe', hc: '#a8a29e' })],
    ['weevil-underwood', bat('#65a30d', '#bef264', { head: 'scythe', hc: '#a3e635' })],
    ['rex-raptor', bat('#4d7c0f', '#a3e635', { head: 'axe', hc: '#84cc16', hs: 1.2 })],
  ],
  sds: [
    ['meliodas', sword('#7f1d1d', BLACK, '#ef4444', { w: 4.6, len: 38, glow: '#ef4444' })], // Lostvayne
    ['ban', staff('#a16207', '#fde047', { head: 'orb', hc: '#fcd34d' })],
    ['king', staff('#f9a8d4', '#fdf2f8', { glow: PINK, head: 'spear', hc: '#fce7f3', w: 4.6 })], // Chastiefol
    ['diane', staff('#78716c', '#a8a29e', { w: 6, glow: '#a8a29e', head: 'hammer', hc: '#78716c', hs: 1.7 })], // Gideon
    ['gowther', bat('#f472b6', '#fbcfe8', { head: 'orb', hc: '#fdf2f8' })],
    ['merlin', staff('#7c3aed', '#fde68a', { head: 'orb', hc: '#c4b5fd', glow: '#a78bfa' })],
    ['escanor', staff('#fbbf24', '#78350f', { w: 5.4, glow: '#fde047', head: 'axe', hc: '#f59e0b', hs: 1.8 })], // Rhitta
    ['elizabeth-liones', staff('#fde68a', GOLD, { glow: '#fde047', head: 'crystal', hc: '#fef3c7' })],
    ['zeldris', sword('#1f2937', BLACK, '#7c3aed', { w: 4.4, len: 44, glow: '#7c3aed' })],
    ['estarossa', sword('#991b1b', BLACK, '#f87171', { w: 4.4, len: 44, glow: '#ef4444' })],
    ['gilthunder', sword('#fde047', '#78350f', GOLD, { w: 4.4, len: 44, glow: '#facc15' })],
    ['hendrickson', sword('#9ca3af', BLACK, '#6b7280', { w: 4, len: 44, glow: '#7f1d1d' })],
    ['derieri', bat('#f9a8d4', PINK, { head: 'hammer', hc: '#fb7185', hs: 1.3 })],
    ['monspeet', katana('#bae6fd', '#1e3a8a', { glow: ICE })],
    ['hawk', bat('#f472b6', '#fde047', { head: 'orb', hc: '#fecdd3' })],
    ['griamore', sword('#94a3b8', '#78350f', '#6b7280', { w: 4.4, len: 44 })],
  ],
  inuyasha: [
    ['inuyasha', sword('#f1f5f9', '#7f1d1d', '#e2e8f0', { w: 7, len: 48, glow: GOLD })], // Tessaiga
    ['kagome-higurashi', staff('#fb7185', '#fde68a', { head: 'spear', hc: '#fecdd3', glow: '#fb7185' })], // the sacred arrow
    ['sesshomaru', katana('#a7f3d0', '#14532d', { glow: '#4ade80', len: 48 })], // Bakusaiga
    ['miroku', staff('#fbbf24', '#78350f', { head: 'crescent', hc: '#fde68a', hs: 0.9 })],
    ['sango', bat('#f1f5f9', '#e2e8f0', { head: 'crescent', hc: '#e5e7eb', hs: 1.8 })], // the Hiraikotsu
    ['shippo', bat('#fb923c', '#fed7aa', { head: 'flame', hc: '#fde047' })],
    ['kikyo', staff('#f9a8d4', '#fdf2f8', { head: 'spear', hc: '#ffffff', glow: '#fda4af' })],
    ['naraku', bat('#6b21a8', '#a855f7', { head: 'orb', hc: '#581c87', hs: 1.3 })],
    ['kagura', bat('#bbf7d0', '#4ade80', { head: 'crescent', hc: '#dcfce7', hs: 1.5 })], // her fan
    ['koga', bat('#78716c', '#a8a29e', { head: 'bolt', hc: '#e5e7eb' })],
    ['bankotsu', staff('#6b7280', '#a5b4fc', { w: 5, head: 'axe', hc: '#9ca3af', hs: 1.5 })], // Banryu
    ['totosai', staff('#78350f', '#fbbf24', { head: 'hammer', hc: '#92400e' })],
    ['jaken', staff('#78350f', '#fbbf24', { head: 'orb', hc: '#fb923c' })], // the Staff of Two Heads
    ['jakotsu', katana('#f9a8d4', '#831843', { glow: PINK, w: 2.8 })],
    ['kohaku', staff('#94a3b8', '#cbd5e1', { head: 'scythe', hc: '#cbd5e1' })],
    ['hakudoshi', staff('#4b5563', '#e5e7eb', { head: 'spear', hc: '#9ca3af' })],
  ],
  witcher: [
    ['geralt-of-rivia', sword('#cbd5e1', '#44403c', '#9ca3af', { w: 4, len: 46, glow: '#93c5fd' })], // the silver sword
    ['ciri', sword('#99f6e4', '#0f766e', '#5eead4', { w: 3.8, len: 44, glow: TEAL })],
    ['yennefer-of-vengerberg', staff('#7c3aed', '#fde68a', { head: 'orb', hc: '#a855f7', glow: '#c084fc' })],
    ['eredin-breacc-glas', sword('#bae6fd', '#1e3a8a', ICE, { w: 4.4, len: 46, glow: ICE })],
    ['vesemir', sword('#cbd5e1', '#44403c', '#9ca3af', { w: 4, len: 44 })],
    ['eskel', sword('#cbd5e1', '#44403c', '#9ca3af', { w: 4, len: 44 })],
    ['triss-merigold', staff('#b91c1c', '#fde047', { head: 'flame', hc: '#fb923c', glow: '#f97316' })],
    ['regis', sword('#e5e7eb', '#7f1d1d', '#9ca3af', { w: 3.6, len: 40, glow: '#b91c1c' })],
    ['zoltan-chivay', staff('#78350f', '#9ca3af', { head: 'axe', hc: '#9ca3af', hs: 1.3 })],
    ['dandelion', bat('#a16207', '#fde68a', { head: 'orb', hc: '#fcd34d' })], // the lute
    ['roach', bat('#78350f', '#a16207', { head: 'hammer', hc: '#92400e' })],
    ['lambert', sword('#cbd5e1', '#44403c', '#9ca3af', { w: 4, len: 44 })],
    ['keira-metz', staff('#2563eb', '#bfdbfe', { head: 'bolt', hc: '#93c5fd', glow: '#60a5fa' })],
    ['philippa-eilhart', staff('#4c1d95', '#c4b5fd', { head: 'crescent', hc: '#a78bfa', glow: '#8b5cf6' })],
    ['avallac-h', staff('#a5f3fc', '#e0f2fe', { head: 'crystal', hc: '#cffafe', glow: ICE })],
    ['cahir', sword('#9ca3af', BLACK, '#6b7280', { w: 4, len: 44 })],
  ],
  dragonage: [
    ['garrett-hawke', staff('#7c2d12', '#fbbf24', { head: 'orb', hc: '#ef4444', glow: '#f97316' })],
    ['cassandra-pentaghast', sword('#e5e7eb', '#7f1d1d', '#94a3b8', { w: 4.6, len: 42 })],
    ['solas', staff('#047857', '#a7f3d0', { head: 'crystal', hc: '#34d399', glow: '#10b981' })],
    ['cullen-rutherford', sword('#e5e7eb', '#78350f', '#94a3b8', { w: 4.6, len: 42, glow: '#93c5fd' })],
    ['alistair-theirin', sword('#cbd5e1', '#78350f', '#94a3b8', { w: 4.8, len: 42 })],
    ['iron-bull', staff('#44403c', '#9ca3af', { w: 5.4, head: 'axe', hc: '#9ca3af', hs: 1.7 })],
    ['leliana', sword('#e5e7eb', '#7f1d1d', '#9ca3af', { w: 3, len: 32 })],
    ['morrigan', staff('#581c87', '#d8b4fe', { head: 'orb', hc: '#a855f7', glow: '#c084fc' })],
    ['dorian-pavus', staff('#b91c1c', '#fde047', { head: 'flame', hc: '#fb923c', glow: '#ef4444' })],
    ['varric-tethras', staff('#78350f', '#fbbf24', { head: 'gun', hc: '#92400e' })], // Bianca
    ['flemeth', staff('#4b5563', '#fca5a5', { head: 'flame', hc: '#ef4444' })],
    ['anders', staff('#1d4ed8', '#93c5fd', { head: 'bolt', hc: '#bfdbfe', glow: '#60a5fa' })],
    ['fenris', sword('#e0f2fe', '#1e3a8a', '#7dd3fc', { w: 6.4, len: 50, glow: '#38bdf8' })], // the lyrium greatsword
    ['isabela', sword('#e5e7eb', '#7f1d1d', GOLD, { w: 3.4, len: 38 })],
    ['blackwall', sword('#cbd5e1', '#78350f', '#94a3b8', { w: 4.8, len: 44 })],
    ['sera', staff('#65a30d', '#fde68a', { head: 'spear', hc: '#bef264' })],
  ],
  dota: [
    ['phantom-assassin', sword('#c4b5fd', '#1e1b4b', '#7c3aed', { w: 4, len: 40, glow: '#8b5cf6' })],
    ['anti-mage', sword('#a5b4fc', '#1e1b4b', '#6366f1', { w: 4, len: 40, glow: '#818cf8' })],
    ['juggernaut', katana('#e5e7eb', '#14532d', { glow: '#22c55e', len: 48 })],
    ['invoker', staff('#7c3aed', '#fde047', { head: 'orb', hc: '#f97316', glow: '#fb923c', hs: 1.2 })],
    ['shadow-fiend', bat('#111827', '#ef4444', { head: 'flame', hc: '#dc2626' })],
    ['storm-spirit', staff('#2563eb', '#bfdbfe', { head: 'bolt', hc: '#93c5fd', glow: '#60a5fa' })],
    ['io', staff('#22d3ee', '#ecfeff', { head: 'orb', hc: '#67e8f9', glow: '#22d3ee' })],
    ['sniper', staff('#78350f', '#9ca3af', { head: 'gun', hc: '#57534e' })],
    ['pudge', staff('#78716c', '#9ca3af', { w: 5, head: 'axe', hc: '#a8a29e', hs: 1.5 })],
    ['crystal-maiden', staff('#bae6fd', '#ffffff', { head: 'crystal', hc: '#e0f2fe', glow: ICE })],
    ['earthshaker', staff('#78350f', '#a16207', { w: 5.4, head: 'hammer', hc: '#92400e', hs: 1.6 })],
    ['axe', staff('#78350f', '#9ca3af', { w: 5, head: 'axe', hc: '#dc2626', hs: 1.8 })],
    ['sven', sword('#fde047', '#78350f', GOLD, { w: 6.4, len: 48, glow: '#facc15' })],
    ['lina', staff('#dc2626', '#fde047', { head: 'flame', hc: '#fb923c', glow: '#ef4444' })],
    ['zeus', bat('#1d4ed8', '#fde047', { head: 'bolt', hc: '#fef08a' })],
    ['tinker', staff('#64748b', '#f59e0b', { head: 'gun', hc: '#ef4444' })],
  ],
  poe: [
    ['the-duelist', sword('#e5e7eb', '#78350f', '#94a3b8', { w: 4.2, len: 42 })],
    ['the-shadow', sword('#6b7280', BLACK, '#4b5563', { w: 3, len: 30, glow: '#7c3aed' })],
    ['atziri', staff('#b91c1c', '#fde047', { head: 'flame', hc: '#fb923c', glow: '#ef4444' })],
    ['the-scion', sword('#a5b4fc', '#312e81', '#818cf8', { w: 4, len: 42, glow: '#818cf8' })],
    ['the-templar', staff('#78350f', '#fbbf24', { w: 5, head: 'hammer', hc: '#fbbf24', glow: '#fde047', hs: 1.4 })],
    ['the-marauder', staff('#44403c', '#9ca3af', { w: 5.6, head: 'hammer', hc: '#78716c', hs: 1.8 })],
    ['zana', staff('#d97706', '#fde68a', { head: 'crystal', hc: '#fde047' })],
    ['the-ranger', staff('#15803d', '#bbf7d0', { head: 'spear', hc: '#86efac' })],
    ['the-witch', staff('#7f1d1d', '#fca5a5', { head: 'flame', hc: '#fb923c', glow: '#ef4444' })],
    ['einhar', staff('#78350f', '#9ca3af', { head: 'spear', hc: '#d1d5db' })],
    ['shaper-of-realms', bat('#312e81', '#818cf8', { head: 'crystal', hc: '#a5b4fc', hs: 1.3 })],
    ['kitava', bat('#450a0a', '#dc2626', { head: 'orb', hc: '#7f1d1d', hs: 1.3 })],
    ['sirus', sword('#f1f5f9', '#e2e8f0', '#ffffff', { w: 4.4, len: 46, glow: '#ffffff' })],
    ['niko', bat('#0f766e', '#2dd4bf', { head: 'orb', hc: '#99f6e4' })],
    ['alva', sword('#fbbf24', '#78350f', GOLD, { w: 3.6, len: 38 })],
    ['maven', bat('#6d28d9', '#c4b5fd', { head: 'crystal', hc: '#a78bfa' })],
  ],
  finalfantasy: [
    ['cloud-strife', sword('#cbd5e1', '#44403c', '#94a3b8', { w: 9, len: 52, glow: '#60a5fa' })], // the Buster Sword
    ['squall-leonhart', sword('#e5e7eb', '#1e3a8a', '#94a3b8', { w: 5, len: 46, glow: '#93c5fd', head: 'gun', hc: '#9ca3af' })], // the gunblade
    ['sephiroth', katana('#e5e7eb', '#111827', { w: 3, len: 56, glow: '#a5b4fc' })], // the Masamune
    ['auron', katana('#f87171', '#7f1d1d', { w: 5, len: 54, glow: '#ef4444' })],
    ['tidus', sword('#38bdf8', '#1e3a8a', GOLD, { w: 4.6, len: 44, glow: BLUE })],
    ['lightning', sword('#e5e7eb', '#7f1d1d', '#f87171', { w: 4.6, len: 44, glow: '#fb923c', head: 'gun', hc: '#9ca3af' })],
    ['tifa-lockhart', bat('#dc2626', '#fde047', { head: 'hammer', hc: '#ef4444', hs: 1.3 })],
    ['aerith-gainsborough', staff('#f9a8d4', '#fde68a', { head: 'orb', hc: '#fbcfe8', glow: '#a7f3d0' })],
    ['lulu', staff('#312e81', '#e0e7ff', { head: 'flame', hc: '#fb923c', glow: '#f97316' })],
    ['vivi-ornitier', staff('#92400e', '#fde68a', { head: 'orb', hc: '#facc15' })],
    ['barret-wallace', staff('#44403c', '#fbbf24', { head: 'gun', hc: '#57534e', w: 5 })],
    ['zidane-tribal', sword('#e5e7eb', '#7f1d1d', '#94a3b8', { w: 3.2, len: 32 })],
    ['noctis-lucis-caelum', sword('#c4b5fd', '#1e1b4b', '#7c3aed', { w: 4.4, len: 46, glow: '#8b5cf6' })],
    ['terra-branford', staff('#16a34a', '#f9a8d4', { head: 'flame', hc: '#fb7185', glow: '#4ade80' })],
    ['kefka-palazzo', staff('#a855f7', '#fde047', { head: 'orb', hc: '#f0abfc', glow: '#d946ef' })],
    ['yuna', staff('#dbeafe', '#fbbf24', { head: 'crystal', hc: '#93c5fd', glow: '#60a5fa' })],
  ],
  elderscrolls: [
    ['dovahkiin', sword('#e5e7eb', '#78350f', '#94a3b8', { w: 5.4, len: 46, glow: '#60a5fa' })], // a dragonbone blade
    ['ulfric-stormcloak', staff('#78350f', '#9ca3af', { w: 5, head: 'axe', hc: '#9ca3af', hs: 1.5, glow: '#60a5fa' })],
    ['tiber-septim', sword('#fbbf24', '#7f1d1d', GOLD, { w: 5, len: 46, glow: '#fde047' })],
    ['serana', sword('#cbd5e1', '#7f1d1d', '#9ca3af', { w: 4, len: 44, glow: '#b91c1c' })],
    ['miraak', staff('#1f2937', '#a78bfa', { head: 'crescent', hc: '#7c3aed', hs: 1.3, glow: '#8b5cf6' })],
    ['lydia', sword('#cbd5e1', '#78350f', '#94a3b8', { w: 5, len: 42 })],
    ['brynjolf', sword('#9ca3af', BLACK, '#6b7280', { w: 3, len: 30 })],
    ['alduin', bat('#7f1d1d', '#ef4444', { head: 'flame', hc: '#fde047', hs: 1.5 })],
    ['paarthurnax', bat('#475569', '#7dd3fc', { head: 'flame', hc: '#e0f2fe', hs: 1.3 })],
    ['cicero', sword('#cbd5e1', '#7f1d1d', '#9ca3af', { w: 3, len: 30 })],
    ['j-zargo', staff('#b45309', '#fde047', { head: 'flame', hc: '#fb923c', glow: '#f97316' })],
    ['farkas', sword('#cbd5e1', '#78350f', '#94a3b8', { w: 6.8, len: 48 })],
    ['vilkas', sword('#cbd5e1', '#78350f', '#94a3b8', { w: 5.4, len: 44 })],
    ['aela-the-huntress', staff('#78350f', '#bef264', { head: 'spear', hc: '#d9f99d' })],
    ['esbern', sword('#e5e7eb', '#7f1d1d', GOLD, { w: 4, len: 42 })],
    ['mercer-frey', sword('#6b7280', BLACK, '#4b5563', { w: 3, len: 32, glow: '#7c3aed' })],
  ],
  assassinscreed: [
    ['altair-ibn-la-ahad', sword('#e5e7eb', '#7f1d1d', '#94a3b8', { w: 3.4, len: 36 })],
    ['ezio-auditore', sword('#e5e7eb', '#7f1d1d', '#94a3b8', { w: 3.2, len: 34, glow: '#ef4444' })],
    ['bayek-of-siwa', sword('#fbbf24', '#78350f', GOLD, { w: 4, len: 40 })],
    ['kassandra', staff('#78350f', '#fbbf24', { head: 'spear', hc: '#fde68a', glow: '#facc15' })], // the Spear of Leonidas
    ['eivor', staff('#78350f', '#9ca3af', { w: 5, head: 'axe', hc: '#cbd5e1', hs: 1.4 })],
    ['edward-kenway', sword('#cbd5e1', '#78350f', GOLD, { w: 4.4, len: 40 })],
    ['aveline-de-grandpre', sword('#e5e7eb', '#7f1d1d', '#94a3b8', { w: 3.2, len: 36 })],
    ['connor-kenway', staff('#78350f', '#9ca3af', { head: 'axe', hc: '#cbd5e1', hs: 1.1 })],
    ['shay-cormac', sword('#cbd5e1', '#1e3a8a', '#94a3b8', { w: 4, len: 40 })],
    ['evie-frye', sword('#e5e7eb', '#7f1d1d', '#94a3b8', { w: 3.2, len: 34 })],
    ['leonardo-da-vinci', staff('#a16207', '#fde68a', { head: 'crystal', hc: '#fef3c7' })],
    ['arno-dorian', sword('#e5e7eb', '#1e3a8a', '#94a3b8', { w: 3.4, len: 40 })],
    ['haytham-kenway', sword('#e5e7eb', '#1f2937', '#94a3b8', { w: 3.6, len: 42 })],
    ['jacob-frye', staff('#44403c', '#9ca3af', { head: 'hammer', hc: '#6b7280' })],
    ['basim-ibn-ishaq', sword('#c4b5fd', '#1e1b4b', '#7c3aed', { w: 3.4, len: 38, glow: '#8b5cf6' })],
    ['desmond-miles', sword('#e5e7eb', '#334155', '#94a3b8', { w: 3.2, len: 34, glow: '#60a5fa' })],
  ],
  zelda: [
    ['link', sword('#bfdbfe', '#1e3a8a', GOLD, { w: 5, len: 46, glow: '#60a5fa' })], // the Master Sword
    ['urbosa', sword('#fde68a', '#7c2d12', GOLD, { w: 5.4, len: 42, glow: '#fde047' })],
    ['princess-zelda', staff('#fde68a', '#fbbf24', { head: 'crystal', hc: '#fef9c3', glow: '#fde047' })],
    ['ganondorf', sword('#7e22ce', BLACK, '#a855f7', { w: 6.4, len: 50, glow: '#a855f7' })],
    ['midna', staff('#a855f7', '#fb923c', { head: 'crescent', hc: '#c084fc' })],
    ['daruk', staff('#78350f', '#a16207', { w: 6, head: 'hammer', hc: '#78716c', hs: 1.8 })],
    ['impa', sword('#cbd5e1', '#7f1d1d', '#94a3b8', { w: 3.4, len: 40, glow: '#f87171' })],
    ['revali', staff('#1d4ed8', '#fde047', { head: 'spear', hc: '#93c5fd' })],
    ['mipha', staff('#7dd3fc', '#e0f2fe', { head: 'spear', hc: '#bae6fd', glow: ICE, w: 4.6 })],
    ['fi', sword('#a5f3fc', '#0e7490', '#67e8f9', { w: 3.4, len: 44, glow: '#22d3ee' })],
    ['tingle', bat('#16a34a', '#f9a8d4', { head: 'orb', hc: '#fbcfe8' })],
    ['sidon', staff('#fca5a5', '#fde047', { head: 'spear', hc: '#fecaca', w: 4.6 })],
    ['tetra', sword('#cbd5e1', '#78350f', GOLD, { w: 3.6, len: 36 })],
    ['skull-kid', bat('#a16207', '#fde68a', { head: 'orb', hc: '#fef08a' })],
    ['sheik', sword('#9ca3af', '#312e81', '#6b7280', { w: 2.6, len: 30 })],
    ['navi', bat('#a5f3fc', '#67e8f9', { head: 'orb', hc: '#ecfeff', hs: 1.2 })],
  ],
  masseffect: [
    ['commander-shepard', staff('#334155', '#60a5fa', { head: 'gun', hc: '#475569', glow: '#38bdf8' })],
    ['thane-krios', staff('#312e81', '#a78bfa', { head: 'gun', hc: '#1f2937' })],
    ['miranda-lawson', bat('#7c3aed', '#c4b5fd', { head: 'orb', hc: '#a78bfa' })],
    ['javik', staff('#475569', '#f97316', { head: 'gun', hc: '#334155' })],
    ['urdnot-wrex', staff('#78350f', '#ef4444', { w: 5, head: 'gun', hc: '#57534e' })],
    ['liara-t-soni', bat('#3b82f6', '#93c5fd', { head: 'orb', hc: '#bfdbfe' })],
    ['tali-zorah', staff('#6d28d9', '#c4b5fd', { head: 'gun', hc: '#4c1d95' })],
    ['garrus-vakarian', staff('#1d4ed8', '#93c5fd', { head: 'gun', hc: '#1e3a8a' })],
    ['mordin-solus', staff('#65a30d', '#bef264', { head: 'gun', hc: '#4d7c0f' })],
    ['samara', bat('#6d28d9', '#c084fc', { head: 'orb', hc: '#e9d5ff', hs: 1.2 })],
    ['jeff-joker-moreau', staff('#44403c', '#94a3b8', { head: 'gun', hc: '#57534e' })],
    ['jack', bat('#78350f', '#fb923c', { head: 'orb', hc: '#fdba74', hs: 1.2 })],
    ['grunt', staff('#4d7c0f', '#bef264', { w: 5.4, head: 'hammer', hc: '#65a30d', hs: 1.5 })],
    ['legion', staff('#475569', '#e0f2fe', { head: 'gun', hc: '#334155', glow: '#7dd3fc' })],
    ['harbinger', bat('#1e3a8a', '#ef4444', { head: 'orb', hc: '#dc2626', hs: 1.4 })],
    ['kaidan-alenko', bat('#2563eb', '#93c5fd', { head: 'orb', hc: '#dbeafe' })],
  ],
  overwatch: [
    ['tracer', staff('#0ea5e9', '#fb923c', { head: 'gun', hc: '#f97316' })],
    ['soldier-76', staff('#1e3a8a', '#9ca3af', { head: 'gun', hc: '#374151' })],
    ['cassidy', staff('#78350f', '#fbbf24', { head: 'gun', hc: '#a16207' })],
    ['genji', sword('#4ade80', '#14532d', '#22c55e', { w: 4, len: 44, glow: '#22c55e' })], // the dragonblade
    ['doomfist', staff('#78716c', '#dc2626', { w: 6, head: 'hammer', hc: '#a8a29e', hs: 1.7, glow: '#f97316' })],
    ['d-va', bat('#f472b6', '#67e8f9', { head: 'gun', hc: '#f9a8d4' })],
    ['mercy', staff('#fde68a', '#fbbf24', { head: 'crystal', hc: '#fef9c3', glow: '#fde047' })],
    ['widowmaker', staff('#6d28d9', '#a78bfa', { head: 'gun', hc: '#4c1d95' })],
    ['zenyatta', bat('#fbbf24', '#fde68a', { head: 'orb', hc: '#fef9c3', hs: 1.3 })],
    ['junkrat', staff('#a16207', '#ef4444', { head: 'orb', hc: '#dc2626', hs: 1.2 })],
    ['ana', staff('#0e7490', '#67e8f9', { head: 'gun', hc: '#155e75' })],
    ['reinhardt', staff('#6b7280', '#fbbf24', { w: 6, head: 'hammer', hc: '#9ca3af', hs: 1.8, glow: '#f59e0b' })],
    ['reaper', staff('#111827', '#9ca3af', { head: 'gun', hc: '#1f2937' })],
    ['winston', bat('#78716c', '#60a5fa', { head: 'bolt', hc: '#bfdbfe' })],
    ['hanzo', staff('#1d4ed8', '#bfdbfe', { head: 'spear', hc: '#93c5fd', glow: '#38bdf8' })],
    ['pharah', staff('#1d4ed8', '#fbbf24', { head: 'gun', hc: '#2563eb', w: 5 })],
  ],
  halo: [
    ['master-chief', staff('#15803d', '#fde047', { head: 'gun', hc: '#166534' })],
    ['noble-six', sword('#22d3ee', '#1e293b', '#67e8f9', { w: 5, len: 40, glow: '#22d3ee' })],
    ['jameson-locke', staff('#1e3a8a', '#93c5fd', { head: 'gun', hc: '#1e40af' })],
    ['the-arbiter', sword('#22d3ee', '#1e293b', '#67e8f9', { w: 5.4, len: 42, glow: '#06b6d4' })], // the energy sword
    ['atriox', staff('#7f1d1d', '#9ca3af', { w: 6, head: 'hammer', hc: '#78716c', hs: 1.9, glow: '#ef4444' })], // the gravity hammer
    ['kat-b320', staff('#1e40af', '#93c5fd', { head: 'gun', hc: '#1e3a8a' })],
    ['cortana', bat('#a78bfa', '#c4b5fd', { head: 'crystal', hc: '#e9d5ff', hs: 1.2 })],
    ['jun-a266', staff('#4b5563', '#9ca3af', { head: 'gun', hc: '#374151' })],
    ['edward-buck', staff('#a16207', '#fbbf24', { head: 'gun', hc: '#92400e' })],
    ['sergeant-johnson', staff('#166534', '#bbf7d0', { head: 'gun', hc: '#14532d' })],
    ['343-guilty-spark', bat('#7dd3fc', '#e0f2fe', { head: 'orb', hc: '#e0f2fe', hs: 1.3 })],
    ['jorge-052', staff('#6b7280', '#9ca3af', { w: 6, head: 'gun', hc: '#4b5563' })],
    ['emile-a239', sword('#9ca3af', '#111827', '#6b7280', { w: 4.4, len: 38 })],
    ['the-didact', bat('#e0f2fe', '#7dd3fc', { head: 'crystal', hc: '#bae6fd', hs: 1.4 })],
    ['escharum', staff('#78350f', '#a8a29e', { w: 6, head: 'hammer', hc: '#6b7280', hs: 1.7 })],
    ['veronica-dare', staff('#7c3aed', '#c4b5fd', { head: 'gun', hc: '#6d28d9' })],
  ],
}

export const WEAPONS: Record<string, Weapon> = Object.fromEntries(
  Object.entries(TEAMS).flatMap(([team, rows]) => rows.map(([who, w]): [string, Weapon] => [`${team}-${who}`, w])),
)

/** Auras chosen by hand (Dragon Ball: the colour of each fighter's own power-up); everyone else glows in the colours of his signature move. */
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

const bright = (hex: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 1
  const n = parseInt(m[1], 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/**
 * Only characters who really show a glow in their anime or game have an aura: a ki or chakra or reiatsu power-up, a Stand, a flame or lightning power, a
 * biotic or magic glow, a Reaper or Forerunner light. Everyone else carries a weapon but does not glow.
 */
const GLOWING: Record<string, string[]> = {
  dragonball: ['son-goku', 'vegeta', 'son-gohan', 'piccolo', 'trunks', 'android-18', 'tien-shinhan', 'krillin', 'frieza', 'beerus', 'majin-buu', 'cell', 'yamcha', 'master-roshi', 'hit', 'android-17'],
  naruto: ['naruto-uzumaki', 'sasuke-uchiha', 'madara-uchiha', 'minato-namikaze', 'itachi-uchiha', 'jiraiya', 'rock-lee', 'might-guy'],
  bleach: ['ichigo-kurosaki', 'sosuke-aizen', 'kenpachi-zaraki', 'toshiro-hitsugaya', 'genryusai-yamamoto', 'yoruichi-shihoin'],
  onepiece: ['monkey-d-luffy', 'roronoa-zoro', 'portgas-d-ace', 'edward-newgate', 'shanks', 'sanji'],
  aot: ['eren-yeager'],
  mha: ['izuku-midoriya', 'all-might', 'shoto-todoroki', 'katsuki-bakugo', 'endeavor', 'dabi'],
  demonslayer: ['tanjiro-kamado', 'zenitsu-agatsuma', 'kyojuro-rengoku', 'kokushibo'],
  jjk: ['satoru-gojo', 'ryomen-sukuna', 'yuji-itadori', 'yuta-okkotsu'],
  fma: ['edward-elric', 'scar', 'father', 'roy-mustang'],
  jojo: ['jotaro-kujo', 'dio-brando', 'giorno-giovanna', 'josuke-higashikata', 'jolyne-kujo', 'noriaki-kakyoin', 'jean-pierre-polnareff', 'bruno-bucciarati', 'yoshikage-kira', 'guido-mista', 'narancia-ghirga', 'okuyasu-nijimura', 'rohan-kishibe', 'joseph-joestar', 'jonathan-joestar', 'caesar-zeppeli'],
  yugioh: ['yugi-muto', 'atem', 'marik-ishtar', 'ishizu-ishtar', 'maximillion-pegasus'],
  sds: ['meliodas', 'escanor', 'king', 'merlin', 'zeldris', 'estarossa', 'elizabeth-liones'],
  inuyasha: ['inuyasha', 'sesshomaru', 'kikyo', 'kagome-higurashi', 'naraku'],
  witcher: ['yennefer-of-vengerberg', 'triss-merigold', 'ciri'],
  dragonage: ['solas', 'morrigan', 'dorian-pavus', 'anders', 'flemeth', 'garrett-hawke'],
  dota: ['invoker', 'storm-spirit', 'zeus', 'lina', 'crystal-maiden', 'shadow-fiend', 'io'],
  poe: ['shaper-of-realms', 'kitava', 'sirus', 'maven', 'atziri'],
  finalfantasy: ['cloud-strife', 'sephiroth', 'aerith-gainsborough', 'lulu', 'vivi-ornitier', 'terra-branford', 'kefka-palazzo', 'yuna', 'noctis-lucis-caelum'],
  elderscrolls: ['dovahkiin', 'alduin', 'paarthurnax', 'miraak', 'j-zargo', 'serana'],
  zelda: ['princess-zelda', 'ganondorf', 'midna', 'mipha', 'urbosa'],
  masseffect: ['liara-t-soni', 'samara', 'jack', 'miranda-lawson', 'kaidan-alenko', 'javik', 'thane-krios', 'harbinger'],
  overwatch: ['genji', 'zenyatta', 'mercy', 'tracer', 'hanzo'],
  halo: ['cortana', 'the-didact', '343-guilty-spark', 'master-chief', 'noble-six'],
}
const GLOW_IDS = new Set(Object.entries(GLOWING).flatMap(([team, who]) => who.map((w) => `${team}-${w}`)))

export const weaponOf = (playerId: string): Weapon | null => WEAPONS[playerId] ?? null

/** The aura of a character who glows: his own hand-picked one, else the colours of his signature move (a dark colour is swapped for the bright one, as a black glow would not show). */
export function auraOf(playerId: string): Aura | null {
  if (!GLOW_IDS.has(playerId)) return null
  const own = AURAS[playerId]
  if (own) return own
  const team = playerId.split('-')[0]
  const mv = STAR_MOVES[playerId] ?? TEAM_MOVES[team]
  if (!mv) return null
  return bright(mv.c1) < 0.3 ? { c1: mv.c2, c2: '#ffffff' } : { c1: mv.c1, c2: mv.c2 }
}

/** Who glows, for the tests and for anything that wants to list them. */
export const glowingIds = (): string[] => [...GLOW_IDS]
