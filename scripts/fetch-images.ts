// Downloads character portraits and team artwork for personal, non-commercial use.
//   Anime characters + team art: AniList GraphQL API
//   Game characters:            each game's Fandom wiki (MediaWiki pageimages API)
//   Game team art:              Wikipedia (infobox cover art)
// Usage: npx tsx scripts/fetch-images.ts [--force]
// Writes public/images/** and src/data/imageManifest.json, then prints what it couldn't find.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BUILT_IN_TEAMS } from '../src/data/teams/index.ts'

const ROOT = process.cwd()
const PLAYERS_DIR = join(ROOT, 'public/images/players')
const TEAMS_DIR = join(ROOT, 'public/images/teams')
const MANIFEST = join(ROOT, 'src/data/imageManifest.json')
const UA = 'fantasy-cric-sim/0.1 (personal hobby project; non-commercial)'
const FORCE = process.argv.includes('--force')
mkdirSync(PLAYERS_DIR, { recursive: true })
mkdirSync(TEAMS_DIR, { recursive: true })

interface Manifest {
  players: Record<string, string>
  teams: Record<string, { banner?: string; cover?: string }>
}
const manifest: Manifest = existsSync(MANIFEST) && !FORCE ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { players: {}, teams: {} }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const missed: string[] = []

// Wikipedia/AniList rate-limit scripts; wait out a 429 instead of treating it as "not found".
let lastWiki = 0
async function getJson(url: string, init?: RequestInit, tries = 4): Promise<any> {
  const isWiki = url.includes('wikipedia.org')
  let waits = 0
  for (let i = 0; i < tries; i++) {
    if (isWiki) {
      const wait = 1300 - (Date.now() - lastWiki)
      if (wait > 0) await sleep(wait)
      lastWiki = Date.now()
    }
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(25000) })
      if (res.status === 429 && waits++ < 12) {
        const secs = (Number(res.headers.get('retry-after')) || 30) + 2
        console.log(`  rate limited, waiting ${secs}s`)
        await sleep(secs * 1000)
        i-- // a rate limit is not a failed attempt
        continue
      }
      if (!res.ok) return null
      return await res.json()
    } catch {
      await sleep(1500)
    }
  }
  return null
}

async function download(url: string, destBase: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
      if (res.status === 429) { await sleep(15000); continue }
      const type = res.headers.get('content-type') ?? ''
      if (!res.ok || !type.startsWith('image/')) return null
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : type.includes('svg') ? null : 'jpg'
      if (!ext) return null
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1500) return null
      const file = `${destBase}.${ext}`
      writeFileSync(file, buf)
      return file
    } catch {
      await sleep(1500)
    }
  }
  return null
}

const publicPath = (file: string) => file.slice(join(ROOT, 'public').length)
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2))

// ---------------------------------------------------------------- AniList (anime)
const ANILIST = 'https://graphql.anilist.co'
let lastAnilist = 0
async function anilist(query: string, variables: object) {
  const wait = 750 - (Date.now() - lastAnilist)
  if (wait > 0) await sleep(wait)
  lastAnilist = Date.now()
  const json = await getJson(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  return json?.data ?? null
}

// team id -> substrings that must appear in a character's show title (lowercased) + title for artwork search
const ANIME: Record<string, { keys: string[]; search: string }> = {
  bleach: { keys: ['bleach'], search: 'Bleach' },
  naruto: { keys: ['naruto'], search: 'Naruto Shippuden' },
  dragonball: { keys: ['dragon ball'], search: 'Dragon Ball Z' },
  onepiece: { keys: ['one piece'], search: 'One Piece' },
  aot: { keys: ['shingeki', 'attack on titan'], search: 'Attack on Titan' },
  mha: { keys: ['boku no hero', 'my hero'], search: 'My Hero Academia' },
  demonslayer: { keys: ['kimetsu', 'demon slayer'], search: 'Demon Slayer: Kimetsu no Yaiba' },
  jjk: { keys: ['jujutsu'], search: 'Jujutsu Kaisen' },
  fma: { keys: ['hagane', 'fullmetal'], search: 'Fullmetal Alchemist: Brotherhood' },
}

// Spelling AniList actually uses, where our display name differs.
const ANIME_QUERY: Record<string, string> = {
  'Son Goku': 'Goku', 'Son Gohan': 'Gohan', 'Sosuke Aizen': 'Sousuke Aizen', 'Genryusai Yamamoto': 'Genryuusai Yamamoto',
  'Yasutora Sado': 'Yasutora Sado', 'Toshiro Hitsugaya': 'Toushirou Hitsugaya', 'Byakuya Kuchiki': 'Byakuya Kuchiki',
  'Kisuke Urahara': 'Kisuke Urahara', 'Uryu Ishida': 'Uryuu Ishida', 'Edward Newgate': 'Whitebeard',
  'Dracule Mihawk': 'Dracule Mihawk', 'Might Guy': 'Might Guy', 'Choji Akimichi': 'Choujii Akimichi',
  'Shikamaru Nara': 'Shikamaru Nara', 'Tien Shinhan': 'Tenshinhan', 'Android 18': 'Android 18', 'Android 17': 'Android 17',
  'Majin Buu': 'Majin Buu', 'Frieza': 'Freeza', 'Trunks': 'Future Trunks', 'Hit': 'Hit',
  'Edward Elric': 'Edward Elric', 'Alex Louis Armstrong': 'Alex Louis Armstrong', 'Olivier Armstrong': 'Olivier Mira Armstrong',
  'Van Hohenheim': 'Van Hohenheim', 'King Bradley': 'King Bradley', 'Father': 'Father', 'Izumi Curtis': 'Izumi Curtis',
  'Shoto Todoroki': 'Shouto Todoroki', 'Katsuki Bakugo': 'Katsuki Bakugou', 'Izuku Midoriya': 'Izuku Midoriya',
  'Tenya Iida': 'Tenya Iida', 'Shota Aizawa': 'Shouta Aizawa', 'Tomura Shigaraki': 'Tomura Shigaraki', 'Eijiro Kirishima': 'Eijirou Kirishima',
  'Giyu Tomioka': 'Giyuu Tomioka', 'Kyojuro Rengoku': 'Kyoujurou Rengoku', 'Muichiro Tokito': 'Muichirou Tokito',
  'Sanemi Shinazugawa': 'Sanemi Shinazugawa', 'Genya Shinazugawa': 'Genya Shinazugawa', 'Gyomei Himejima': 'Gyoumei Himejima',
  'Satoru Gojo': 'Satoru Gojou', 'Ryomen Sukuna': 'Ryomen Sukuna', 'Toji Fushiguro': 'Touji Fushiguro', 'Megumi Fushiguro': 'Megumi Fushiguro',
  'Toge Inumaki': 'Toge Inumaki', 'Kinji Hakari': 'Kinji Hakari', 'Aoi Todo': 'Aoi Toudou', 'Suguru Geto': 'Suguru Geto',
  'Kon': 'Kon', 'Rukia Kuchiki': 'Rukia Kuchiki', 'Hange Zoe': 'Hange Zoe', 'Kenny Ackerman': 'Kenny Ackerman',
  'Erwin Smith': 'Erwin Smith', 'Levi Ackerman': 'Levi', 'Eren Yeager': 'Eren Yeager', 'Zeke Yeager': 'Zeke Yeager',
}

async function findAnimeCharacter(teamId: string, name: string) {
  const { keys } = ANIME[teamId]
  const q = ANIME_QUERY[name] ?? name
  const data = await anilist(
    `query($q:String){ Page(perPage:12){ characters(search:$q, sort:FAVOURITES_DESC){ name{full} image{large} favourites media(perPage:8){ nodes{ title{romaji english native} } } } } }`,
    { q },
  )
  const chars: any[] = data?.Page?.characters ?? []
  const inShow = (c: any) => c.media.nodes.some((n: any) => keys.some((k) => Object.values(n.title).join(' ').toLowerCase().includes(k)))
  return chars.find((c) => inShow(c) && c.image?.large && !c.image.large.includes('default')) ?? null
}

async function runAnime() {
  for (const team of BUILT_IN_TEAMS.filter((t) => ANIME[t.id])) {
    for (const p of team.players) {
      if (manifest.players[p.id]) continue
      const hit = await findAnimeCharacter(team.id, p.name)
      const file = hit ? await download(hit.image.large, join(PLAYERS_DIR, p.id)) : null
      if (file) { manifest.players[p.id] = publicPath(file); console.log(`✓ ${team.short} ${p.name}  <- ${hit.name.full}`) }
      else { missed.push(`${team.short} ${p.name}`); console.log(`✗ ${team.short} ${p.name}`) }
    }
    save()
    // team artwork
    if (!manifest.teams[team.id]?.banner && !manifest.teams[team.id]?.cover) {
      const data = await anilist(
        `query($q:String){ Media(search:$q, type:ANIME, sort:POPULARITY_DESC){ bannerImage coverImage{ extraLarge large } } }`,
        { q: ANIME[team.id].search },
      )
      const m = data?.Media
      const entry: { banner?: string; cover?: string } = {}
      if (m?.bannerImage) { const f = await download(m.bannerImage, join(TEAMS_DIR, `${team.id}-banner`)); if (f) entry.banner = publicPath(f) }
      const coverUrl = m?.coverImage?.extraLarge ?? m?.coverImage?.large
      if (coverUrl) { const f = await download(coverUrl, join(TEAMS_DIR, `${team.id}-cover`)); if (f) entry.cover = publicPath(f) }
      manifest.teams[team.id] = entry
      console.log(`  team art ${team.short}:`, Object.keys(entry).join(', ') || 'none')
      save()
    }
  }
}

// ---------------------------------------------------------------- Fandom wikis (games)
const WIKI: Record<string, string> = {
  witcher: 'witcher.fandom.com', dragonage: 'dragonage.fandom.com', dota: 'dota2.fandom.com', poe: 'pathofexile.fandom.com',
  finalfantasy: 'finalfantasy.fandom.com', elderscrolls: 'elderscrolls.fandom.com', assassinscreed: 'assassinscreed.fandom.com',
  zelda: 'zelda.fandom.com', masseffect: 'masseffect.fandom.com', overwatch: 'overwatch.fandom.com', halo: 'halo.fandom.com',
}

// Wiki page titles where our display name isn't the page name.
const WIKI_TITLE: Record<string, string> = {
  'witcher:Eredin Breacc Glas': 'Eredin', 'witcher:Yennefer of Vengerberg': 'Yennefer of Vengerberg', "witcher:Avallac'h": "Avallac'h",
  'dragonage:Garrett Hawke': 'Hawke', 'dragonage:Cassandra Pentaghast': 'Cassandra Pentaghast', 'dragonage:Iron Bull': 'The Iron Bull',
  'dragonage:Dorian Pavus': 'Dorian Pavus', 'dragonage:Solas': 'Solas', 'dragonage:Cullen Rutherford': 'Cullen Rutherford',
  'dota:Anti-Mage': 'Anti-Mage', 'dota:Io': 'Io', 'dota:Invoker': 'Invoker',
  'finalfantasy:Cloud Strife': 'Cloud Strife', 'finalfantasy:Noctis Lucis Caelum': 'Noctis Lucis Caelum', 'finalfantasy:Zidane Tribal': 'Zidane Tribal',
  'finalfantasy:Vivi Ornitier': 'Vivi Ornitier', 'finalfantasy:Kefka Palazzo': 'Kefka Palazzo', 'finalfantasy:Squall Leonhart': 'Squall Leonhart',
  'finalfantasy:Barret Wallace': 'Barret Wallace', 'finalfantasy:Tifa Lockhart': 'Tifa Lockhart', 'finalfantasy:Aerith Gainsborough': 'Aerith Gainsborough',
  'elderscrolls:Dovahkiin': 'Dragonborn (Skyrim)', 'elderscrolls:Tiber Septim': 'Tiber Septim', 'elderscrolls:Aela the Huntress': 'Aela the Huntress',
  'assassinscreed:Altair Ibn-La\'Ahad': 'Altaïr Ibn-La\'Ahad', 'assassinscreed:Ezio Auditore': 'Ezio Auditore da Firenze',
  'assassinscreed:Kassandra': 'Kassandra', 'assassinscreed:Eivor': 'Eivor', 'assassinscreed:Leonardo da Vinci': 'Leonardo da Vinci',
  'assassinscreed:Aveline de Grandpre': 'Aveline de Grandpré', 'assassinscreed:Basim Ibn Ishaq': 'Basim Ibn Ishaq',
  'zelda:Link': 'Link', 'zelda:Princess Zelda': 'Princess Zelda', 'zelda:Ganondorf': 'Ganondorf', 'zelda:Impa': 'Impa', 'zelda:Fi': 'Fi',
  'masseffect:Commander Shepard': 'Commander Shepard', 'masseffect:Thane Krios': 'Thane Krios', 'masseffect:Urdnot Wrex': 'Wrex',
  "masseffect:Liara T'Soni": "Liara T'Soni", "masseffect:Tali'Zorah": "Tali'Zorah", 'masseffect:Garrus Vakarian': 'Garrus Vakarian',
  'masseffect:Mordin Solus': 'Mordin Solus', 'masseffect:Jeff "Joker" Moreau': 'Jeff Moreau', 'masseffect:Kaidan Alenko': 'Kaidan Alenko',
  'overwatch:Soldier: 76': 'Soldier: 76', 'overwatch:Cassidy': 'Cassidy', 'overwatch:D.Va': 'D.Va',
  'halo:Master Chief': 'John-117', 'halo:Noble Six': 'Noble Six', 'halo:Jameson Locke': 'Jameson Locke', 'halo:The Arbiter': 'Thel \'Vadam',
  'halo:Atriox': 'Atriox', 'halo:Kat-B320': 'Catherine-B320', 'halo:Cortana': 'Cortana', 'halo:Jun-A266': 'Jun-A266',
  'halo:Edward Buck': 'Edward Buck', 'halo:Sergeant Johnson': 'Avery Johnson', 'halo:343 Guilty Spark': '343 Guilty Spark',
  'halo:Jorge-052': 'Jorge-052', 'halo:Emile-A239': 'Emile-A239', 'halo:The Didact': 'Didact', 'halo:Escharum': 'Escharum', 'halo:Veronica Dare': 'Veronica Dare',
  'poe:Atziri': 'Atziri, Queen of the Vaal', 'poe:Kitava': 'Kitava', 'poe:Sirus': 'Sirus, Awakener of Worlds', 'poe:Maven': 'The Maven',
  'poe:Shaper of Realms': 'The Shaper', 'poe:Zana': 'Zana, Master Cartographer', 'poe:Einhar': 'Einhar, Beastmaster', 'poe:Niko': 'Niko, Master of the Depths', 'poe:Alva': 'Alva, Master Explorer',
  'poe:The Duelist': 'Duelist', 'poe:The Shadow': 'Shadow', 'poe:The Scion': 'Scion', 'poe:The Templar': 'Templar',
  'poe:The Marauder': 'Marauder', 'poe:The Ranger': 'Ranger', 'poe:The Witch': 'Witch',
}

// Fandom's image CDN sits behind a Cloudflare bot challenge, so game characters come from Wikipedia instead.
// Only characters with a Wikipedia infobox image will match; the rest keep their initials.
async function wikiImage(series: string, title: string): Promise<string | null> {
  const pick = (j: any, needle: string) => {
    const hits = (Object.values(j?.query?.pages ?? {}) as any[]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    return hits.find((h) => h.thumbnail?.source && h.title.toLowerCase().includes(needle))?.thumbnail.source ?? null
  }
  const needle = title.toLowerCase().replace(/^the /, '').split(/[\s,:(]+/)[0]
  const base = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=480&format=json'
  for (const term of [`${title} ${series} character`, `${title} ${series}`]) {
    const j = await getJson(`${base}&generator=search&gsrlimit=4&gsrsearch=${encodeURIComponent(term)}`)
    const src = pick(j, needle)
    if (src) return src
  }
  return null
}

const WIKIPEDIA_ART: Record<string, string> = {
  witcher: 'The Witcher 3: Wild Hunt', dragonage: 'Dragon Age: Inquisition', dota: 'Dota 2', poe: 'Path of Exile',
  finalfantasy: 'Final Fantasy VII', elderscrolls: 'The Elder Scrolls V: Skyrim', assassinscreed: "Assassin's Creed II",
  zelda: 'The Legend of Zelda: Breath of the Wild', masseffect: 'Mass Effect 2', overwatch: 'Overwatch (video game)', halo: 'Halo: Combat Evolved',
}

async function runGames() {
  for (const team of BUILT_IN_TEAMS.filter((t) => WIKI[t.id])) {
    for (const p of team.players) {
      if (manifest.players[p.id]) continue
      const title = WIKI_TITLE[`${team.id}:${p.name}`] ?? p.name
      const url = await wikiImage(team.series, title)
      const file = url ? await download(url, join(PLAYERS_DIR, p.id)) : null
      if (file) { manifest.players[p.id] = publicPath(file); console.log(`✓ ${team.short} ${p.name}`) }
      else { missed.push(`${team.short} ${p.name}`); console.log(`✗ ${team.short} ${p.name}`) }
    }
    save()
    if (!manifest.teams[team.id]?.cover) {
      // Box art is non-free and hidden from the API, so use the first free image from the franchise's articles.
      let src: string | null = null
      for (const term of [WIKIPEDIA_ART[team.id], team.series]) {
        const j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&generator=search&gsrlimit=5&gsrsearch=${encodeURIComponent(term)}`)
        const hits = (Object.values(j?.query?.pages ?? {}) as any[]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        src = hits.find((h) => h.thumbnail?.source)?.thumbnail.source ?? null
        if (src) break
      }
      const f = src ? await download(src, join(TEAMS_DIR, `${team.id}-cover`)) : null
      manifest.teams[team.id] = f ? { cover: publicPath(f) } : {}
      console.log(`  team art ${team.short}:`, f ? 'cover' : 'none')
      save()
    }
  }
}

await Promise.all([runAnime(), runGames()])
save()
const total = BUILT_IN_TEAMS.reduce((n, t) => n + t.players.length, 0)
console.log(`\nDone. ${Object.keys(manifest.players).length}/${total} portraits, ${Object.values(manifest.teams).filter((t) => t.banner || t.cover).length}/20 teams with art.`)
if (missed.length) console.log(`Missing (${missed.length}):\n  ${missed.join('\n  ')}`)
