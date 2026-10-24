/**
 * The people on the studio desk. They are not players: they are the show's own presenters, drawn in code (no image files to download), and a
 * different three are on the desk from one match to the next. All of them are women, because the phone's built-in voices cannot be trusted to
 * sound like a man, so the desk and the voices agree.
 */
export type HairStyle = 'long' | 'bob' | 'ponytail' | 'bun' | 'curly' | 'short' | 'wavy'
export interface Presenter {
  id: string
  name: string
  skin: string
  hair: string
  hairStyle: HairStyle
  outfit: string
  /** The colour of the name strap and the glow when she speaks. */
  accent: string
  glasses?: boolean
}

export const PRESENTERS: Presenter[] = [
  { id: 'aiko-mori', name: 'Aiko Mori', skin: '#f3d2b3', hair: '#1b1b2a', hairStyle: 'long', outfit: '#4f46e5', accent: '#818cf8' },
  { id: 'priya-nair', name: 'Priya Nair', skin: '#a8714a', hair: '#15121a', hairStyle: 'bun', outfit: '#059669', accent: '#34d399' },
  { id: 'zoe-carter', name: 'Zoe Carter', skin: '#f6dcc3', hair: '#b4412a', hairStyle: 'ponytail', outfit: '#e11d48', accent: '#fb7185' },
  { id: 'amara-okafor', name: 'Amara Okafor', skin: '#6b4429', hair: '#0f0b0a', hairStyle: 'curly', outfit: '#d97706', accent: '#fbbf24', glasses: true },
  { id: 'lena-fischer', name: 'Lena Fischer', skin: '#f4d9c6', hair: '#d8b45a', hairStyle: 'bob', outfit: '#0d9488', accent: '#2dd4bf', glasses: true },
  { id: 'sofia-reyes', name: 'Sofia Reyes', skin: '#d29a6f', hair: '#4a2a1a', hairStyle: 'wavy', outfit: '#7c3aed', accent: '#a78bfa' },
  { id: 'hana-kim', name: 'Hana Kim', skin: '#f1d6bd', hair: '#14131c', hairStyle: 'bob', outfit: '#0284c7', accent: '#38bdf8' },
  { id: 'ruby-malik', name: 'Ruby Malik', skin: '#b9814f', hair: '#17110f', hairStyle: 'long', outfit: '#ea580c', accent: '#fb923c' },
  { id: 'nora-bell', name: 'Nora Bell', skin: '#f8e3d4', hair: '#8a3b22', hairStyle: 'bun', outfit: '#65a30d', accent: '#a3e635' },
  { id: 'isla-grant', name: 'Isla Grant', skin: '#f5d8c2', hair: '#e5e7eb', hairStyle: 'short', outfit: '#c026d3', accent: '#e879f9' },
]
