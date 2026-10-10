// Computes real-world baselines from Cricsheet ball-by-ball JSON.
// Usage: node scripts/baselines.mjs  -> writes src/engine/data/baselines.json and prints a summary.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SINCE = '2022-01-01'

// Keep the sample at "elite" level: full-member internationals and major franchise leagues.
const FULL_MEMBERS = new Set([
  'India', 'Australia', 'England', 'Pakistan', 'South Africa', 'New Zealand', 'Sri Lanka',
  'West Indies', 'Bangladesh', 'Afghanistan', 'Zimbabwe', 'Ireland',
])
const MAJOR_LEAGUES = /Indian Premier League|Big Bash League|SA20|International League T20|Pakistan Super League|Caribbean Premier League|Major League Cricket|Bangladesh Premier League|Lanka Premier League/
function isElite(info) {
  if (info.team_type === 'international') return info.teams.every((t) => FULL_MEMBERS.has(t))
  return MAJOR_LEAGUES.test(info.event?.name ?? '')
}

const FORMATS = {
  t20: {
    dir: join(root, 'data/raw/t20'),
    overs: 20,
    phases: { powerplay: [0, 5], middle: [6, 14], death: [15, 19] },
  },
  odi: {
    dir: join(root, 'data/raw/odi'),
    overs: 50,
    phases: { powerplay: [0, 9], middle: [10, 39], death: [40, 49] },
  },
}

const blank = () => ({
  balls: 0, legalBalls: 0, runs: 0, batterRuns: 0,
  dot: 0, one: 0, two: 0, three: 0, four: 0, six: 0,
  wickets: 0, wides: 0, noballs: 0, byes: 0, legbyes: 0,
})

function add(b, d) {
  const runsBat = d.runs.batter
  const ex = d.extras ?? {}
  const wide = ex.wides !== undefined
  const nb = ex.noballs !== undefined
  b.balls++
  b.runs += d.runs.total
  if (wide) { b.wides++; return }
  if (nb) b.noballs++
  if (ex.byes !== undefined) b.byes++
  if (ex.legbyes !== undefined) b.legbyes++
  if (!nb) b.legalBalls++
  b.batterRuns += runsBat
  if (d.wickets?.some((w) => w.kind !== 'retired hurt' && w.kind !== 'retired out')) b.wickets++
  if (runsBat === 0 && d.runs.total === 0) b.dot++
  if (runsBat === 1) b.one++
  else if (runsBat === 2) b.two++
  else if (runsBat === 3) b.three++
  else if (runsBat === 4) b.four++
  else if (runsBat === 6) b.six++
}

function summarize(b) {
  const lb = b.legalBalls
  const per = (n) => n / b.balls
  return {
    balls: b.balls,
    runsPerOver: (b.runs / lb) * 6,
    dot: per(b.dot), one: per(b.one), two: per(b.two), three: per(b.three),
    four: per(b.four), six: per(b.six),
    wicket: per(b.wickets), wide: per(b.wides), noball: per(b.noballs),
    bye: per(b.byes), legbye: per(b.legbyes),
  }
}

const out = {}
for (const [fmt, cfg] of Object.entries(FORMATS)) {
  const phase = { powerplay: blank(), middle: blank(), death: blank() }
  const overall = blank()
  const innings = { count: 0, totalsFirst: [], totalsSecond: [], wkts: [], allOut: 0 }
  const wicketsFirst = []
  let matches = 0
  const wicketKinds = {}
  let bowlerKinds = 0

  for (const f of readdirSync(cfg.dir).filter((x) => x.endsWith('.json'))) {
    const m = JSON.parse(readFileSync(join(cfg.dir, f), 'utf8'))
    if (m.info.gender !== 'male') continue
    if (m.info.dates[0] < SINCE) continue
    if (m.info.overs !== cfg.overs) continue
    if (!isElite(m.info)) continue
    if (m.info.outcome?.method) continue // skip DLS-affected games
    if (m.innings.length < 2 || m.innings.some((i) => i.super_over)) {
      m.innings = m.innings.filter((i) => !i.super_over)
    }
    if (m.innings.length !== 2) continue
    matches++
    m.innings.forEach((inn, idx) => {
      let total = 0
      let wk = 0
      for (const ov of inn.overs) {
        const key = Object.entries(cfg.phases).find(([, [a, z]]) => ov.over >= a && ov.over <= z)?.[0]
        for (const d of ov.deliveries) {
          if (key) add(phase[key], d)
          add(overall, d)
          total += d.runs.total
          for (const w of d.wickets ?? []) {
            if (w.kind === 'retired hurt' || w.kind === 'retired out') continue
            wk++
            wicketKinds[w.kind] = (wicketKinds[w.kind] ?? 0) + 1
          }
        }
      }
      innings.count++
      ;(idx === 0 ? innings.totalsFirst : innings.totalsSecond).push(total)
      innings.wkts.push(wk)
      if (idx === 0) wicketsFirst.push(wk)
      if (wk >= 10) innings.allOut++
    })
  }

  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
  const sd = (a) => { const mu = mean(a); return Math.sqrt(mean(a.map((x) => (x - mu) ** 2))) }
  const totalW = Object.values(wicketKinds).reduce((a, b) => a + b, 0)
  out[fmt] = {
    matches,
    overall: summarize(overall),
    phases: Object.fromEntries(Object.entries(phase).map(([k, v]) => [k, summarize(v)])),
    firstInningsMean: mean(innings.totalsFirst),
    firstInningsSd: sd(innings.totalsFirst),
    secondInningsMean: mean(innings.totalsSecond),
    wicketsPerInnings: mean(innings.wkts),
    allOutRate: innings.allOut / innings.count,
    // shape of the first innings, for tuning spread as well as the average
    firstInningsQuantiles: Object.fromEntries([0.1, 0.25, 0.5, 0.75, 0.9].map((q) => [q, [...innings.totalsFirst].sort((a, b) => a - b)[Math.floor(q * innings.totalsFirst.length)]])),
    firstInningsWicketsHist: Array.from({ length: 11 }, (_, k) => wicketsFirst.filter((w) => Math.min(w, 10) === k).length / wicketsFirst.length),
    wicketKinds: Object.fromEntries(Object.entries(wicketKinds).map(([k, v]) => [k, v / totalW])),
  }
}

const dest = join(root, 'src/engine/data')
mkdirSync(dest, { recursive: true })
writeFileSync(join(dest, 'baselines.json'), JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
