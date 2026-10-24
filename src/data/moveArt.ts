/**
 * Power-up pictures for the signature-move cut-in. Nothing to register: any picture dropped into `src/assets/moves/` and named after a player's id
 * (`dragonball-son-goku.webp`) is found here by its name. The pictures are only downloaded when a cut-in shows one.
 */
const files = import.meta.glob('../assets/moves/*.{webp,png,jpg,jpeg,gif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export const MOVE_ART: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.[^.]+$/, ''), url]),
)

/** The power-up picture of a player, if one has been added. */
export const moveArtFor = (playerId: string): string | null => MOVE_ART[playerId] ?? null
