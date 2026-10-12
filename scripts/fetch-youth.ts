// Builds the youth pool: anime characters with a portrait AniList can give us (a character with no picture is dropped).
// Usage: npx tsx scripts/fetch-youth.ts
// Reads scripts/youth-candidates.txt, downloads portraits into public/images/players/yt-<slug>.*, adds them to
// src/data/imageManifest.json and writes src/data/youth.json (full players with ratings and a hidden potential).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BUILT_IN_TEAMS } from '../src/data/teams/index.ts'

const ROOT = process.cwd()
const DIR = join(ROOT, 'public/images/players')
const MANIFEST = join(ROOT, 'src/data/imageManifest.json')
const OUT = join(ROOT, 'src/data/youth.json')
const UA = 'fantasy-cric-sim/0.1 (personal hobby project; non-commercial)'
mkdirSync(DIR, { recursive: true })

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { players: Record<string, string>; teams: unknown }
const done: Record<string, any> = existsSync(OUT) ? Object.fromEntries((JSON.parse(readFileSync(OUT, 'utf8')) as any[]).map((p) => [p.id, p])) : {}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const existing = new Set(BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => norm(p.name))))

// seeded randomness so a rebuild gives the same ratings
function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  let a = h >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const clamp = (n: number) => Math.max(8, Math.min(97, Math.round(n)))

function build(id: string, name: string, series: string) {
  const r = rng(id)
  const roll = r()
  const role = roll < 0.3 ? 'BAT' : roll < 0.55 ? 'BOWL' : roll < 0.9 ? 'AR' : 'WK'
  const ability = 36 + r() * 24 // what they can do today
  const potential = Math.min(92, Math.round(ability + 12 + r() * 26)) // the most they could become
  const j = (spread: number) => (r() * 2 - 1) * spread
  const bt = ['fast', 'medium', 'offspin', 'legspin', 'leftspin'][Math.floor(r() * 5)]
  const strong = (o = 0, s = 6) => clamp(ability + o + j(s))
  const weakF = (f: number) => clamp(ability * f + j(5))
  const batStrong = { technique: strong(), power: strong(), temperament: strong(), running: strong(-4, 8) }
  const batWeak = { technique: weakF(0.4), power: weakF(0.45), temperament: weakF(0.55), running: weakF(0.55) }
  const bowlStrong = { type: bt, accuracy: strong(), variation: strong(), stamina: strong(-4, 8) }
  const traitsFor: Record<string, string[]> = {
    BAT: ['anchor', 'finisher', 'big-hitter', 'slow-starter', 'clutch', 'weak-vs-spin', 'pace-crusher'],
    BOWL: ['wicket-taker', 'economical', 'death-specialist', 'powerplay-specialist', 'unpredictable'],
    AR: ['clutch', 'big-match', 'finisher', 'wicket-taker', 'unpredictable'],
    WK: ['safe-hands', 'anchor', 'electric-fielder'],
  }
  const traits = r() < 0.55 ? [traitsFor[role][Math.floor(r() * traitsFor[role].length)]] : []
  const hand = r() < 0.2 ? 'L' : 'R'
  const player =
    role === 'BAT' ? { role, hand, batting: batStrong, bowling: null, fielding: strong(-4, 8) }
    : role === 'WK' ? { role, hand, batting: batStrong, bowling: null, fielding: clamp(ability + 8 + j(4)) }
    : role === 'BOWL' ? { role, hand, batting: batWeak, bowling: bowlStrong, fielding: strong(-6, 8) }
    : { role, hand, batting: { technique: strong(-4), power: strong(-4), temperament: strong(-4), running: strong(-6, 8) }, bowling: { type: bt, accuracy: strong(-4), variation: strong(-4), stamina: strong(-6, 8) }, fielding: strong(0, 8) }
  return { id, name, series, universe: 'anime', ...player, traits, potential }
}

let last = 0
async function anilist(query: string, variables: object) {
  for (let tries = 0; tries < 6; tries++) {
    const wait = 800 - (Date.now() - last)
    if (wait > 0) await sleep(wait)
    last = Date.now()
    try {
      const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(25000) })
      if (res.status === 429) { await sleep((Number(res.headers.get('retry-after')) || 30) * 1000 + 2000); continue }
      if (!res.ok) return null
      return (await res.json())?.data ?? null
    } catch { await sleep(1500) }
  }
  return null
}

async function download(url: string, base: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
      if (res.status === 429) { await sleep(15000); continue }
      const type = res.headers.get('content-type') ?? ''
      if (!res.ok || !type.startsWith('image/') || type.includes('svg')) return null
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg'
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1500) return null
      writeFileSync(`${base}.${ext}`, buf)
      return `/images/players/${base.split('/').pop()}.${ext}`
    } catch { await sleep(1500) }
  }
  return null
}

const lines = readFileSync(join(ROOT, 'scripts/youth-candidates.txt'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'))
let added = 0
const seen = new Set<string>()
for (const line of lines) {
  const [name, keyRaw] = line.split('|').map((s) => s.trim())
  const id = `yt-${slug(name)}`
  if (seen.has(id) || existing.has(norm(name))) { console.log(`- skip ${name}`); continue }
  seen.add(id)
  if (done[id]) { console.log(`= have ${name}`); continue }
  const keys = keyRaw.split('/')
  const data = await anilist(
    `query($q:String){ Page(perPage:10){ characters(search:$q, sort:FAVOURITES_DESC){ name{full} image{large} media(perPage:10){ nodes{ title{romaji english native} } } } } }`,
    { q: name },
  )
  const chars: any[] = data?.Page?.characters ?? []
  const hit = chars.find((c) => c.image?.large && !c.image.large.includes('default') && c.media.nodes.some((n: any) => keys.some((k) => Object.values(n.title).join(' ').toLowerCase().includes(k))))
  const path = hit ? await download(hit.image.large, join(DIR, id)) : null
  if (!path) { console.log(`✗ ${name}`); continue }
  manifest.players[id] = path
  const show = hit.media.nodes.find((n: any) => keys.some((k) => Object.values(n.title).join(' ').toLowerCase().includes(k)))
  done[id] = build(id, name, show?.title?.english ?? show?.title?.romaji ?? keys[0])
  added++
  console.log(`✓ ${name}  <- ${hit.name.full}`)
  if (added % 10 === 0) { writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2)); writeFileSync(OUT, JSON.stringify(Object.values(done), null, 1)) }
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2))
writeFileSync(OUT, JSON.stringify(Object.values(done), null, 1))
console.log(`\nDone: ${Object.keys(done).length} players in the youth pool (${added} new).`)
