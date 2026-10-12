// Saves the portraits a person pasted as image URLs (from a "Current teams" backup file) into the repo, so they ship with
// the game for everyone. Plain downloads of the exact URLs in the file; anything that does not come back as an image is
// reported and skipped.
// Usage: node scripts/bake-image-urls.mjs path/to/fantasy-cric-sim-teams-....json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const file = process.argv[2]
const root = process.cwd()
const manifestPath = join(root, 'src/data/imageManifest.json')
const dir = join(root, 'public/images/players')
mkdirSync(dir, { recursive: true })
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const data = JSON.parse(readFileSync(file, 'utf8')).data
const todo = []
for (const team of Object.values(data.overrides ?? {})) for (const p of team.players) if (p.imageUrl && !manifest.players[p.id]) todo.push({ id: p.id, name: p.name, url: p.imageUrl })
console.log(`${todo.length} portraits to save`)
let ok = 0
const failed = []
for (const { id, name, url } of todo) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (personal hobby project)' }, signal: AbortSignal.timeout(25000) })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/') || type.includes('svg')) { failed.push(`${name} (${res.status} ${type})`); continue }
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg'
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) { failed.push(`${name} (too small)`); continue }
    writeFileSync(join(dir, `${id}.${ext}`), buf)
    manifest.players[id] = `/images/players/${id}.${ext}`
    ok++
  } catch (e) { failed.push(`${name} (${e.message})`) }
  await new Promise((r) => setTimeout(r, 300))
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log(`saved ${ok}`)
if (failed.length) console.log('not saved:', failed.join('; '))
