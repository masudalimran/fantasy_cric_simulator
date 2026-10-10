import manifest from './imageManifest.json'

type TeamArt = { banner?: string; cover?: string }
const players = manifest.players as Record<string, string>
const teams = manifest.teams as Record<string, TeamArt>

/** Portrait from the fetch script, or the drop-in path `public/images/players/<id>.png`. */
export const playerImage = (id: string) => players[id] ?? `/images/players/${id}.png`
export const teamArt = (id: string): TeamArt => teams[id] ?? {}
