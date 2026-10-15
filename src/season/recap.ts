import type { Season, SeasonReview } from './types'

/** One page of the end-of-season story. */
export interface RecapCard {
  kind: 'intro' | 'titles' | 'bat' | 'bowl' | 'wins' | 'milestones' | 'risers'
  title: string
  /** The big thing on the page: a record, a score, a name. */
  big: string
  lines: string[]
  /** Whose portrait goes on the page (one of your players). */
  playerId?: string
  /** More portraits (milestones, risers). */
  more?: string[]
}

const RUN_MARKS = [500, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000]
const WICKET_MARKS = [25, 50, 100, 150, 200, 300]
const fmt = (n: number) => n.toLocaleString('en-US')

/** Career totals for each of your players before this season (from the earlier reviews) and with it. */
export function careerTotals(past: SeasonReview[], current: SeasonReview) {
  const out = new Map<string, { name: string; runsBefore: number; runs: number; wktsBefore: number; wkts: number }>()
  for (const r of past) for (const p of r.players) {
    const o = out.get(p.id) ?? { name: p.name, runsBefore: 0, runs: 0, wktsBefore: 0, wkts: 0 }
    o.runsBefore += p.bat?.runs ?? 0; o.wktsBefore += p.bowl?.wickets ?? 0
    out.set(p.id, o)
  }
  for (const p of current.players) {
    const o = out.get(p.id) ?? { name: p.name, runsBefore: 0, runs: 0, wktsBefore: 0, wkts: 0 }
    o.name = p.name
    o.runs = o.runsBefore + (p.bat?.runs ?? 0); o.wkts = o.wktsBefore + (p.bowl?.wickets ?? 0)
    out.set(p.id, o)
  }
  // players who did not play this year keep their old totals
  for (const o of out.values()) { if (o.runs === 0) o.runs = o.runsBefore; if (o.wkts === 0) o.wkts = o.wktsBefore }
  return out
}

/** Career milestones passed during this season: "1,000 career runs", "50 career wickets". */
export function milestonesReached(past: SeasonReview[], current: SeasonReview): { playerId: string; name: string; text: string }[] {
  const out: { playerId: string; name: string; text: string }[] = []
  for (const [playerId, t] of careerTotals(past, current)) {
    const run = [...RUN_MARKS].reverse().find((m) => t.runsBefore < m && t.runs >= m)
    if (run) out.push({ playerId, name: t.name, text: `${fmt(run)} career runs` })
    const wk = [...WICKET_MARKS].reverse().find((m) => t.wktsBefore < m && t.wkts >= m)
    if (wk) out.push({ playerId, name: t.name, text: `${fmt(wk)} career wickets` })
  }
  return out
}

/** Your biggest and narrowest wins by runs this season, as the match text and the opponent. */
export function winsOf(season: Season): { biggest: { text: string; by: number; vs: string } | null; narrowest: { text: string; by: number; vs: string } | null } {
  const mine = season.myTeamId
  const wins: { text: string; by: number; vs: string }[] = []
  for (const f of season.fixtures) {
    const r = season.results[f.id]
    if (!mine || !r || r.winnerId !== mine || r.margin !== 'runs' || !f.homeId || !f.awayId) continue
    const vs = f.homeId === mine ? f.awayId : f.homeId
    const by = (r.scores[mine]?.runs ?? 0) - (r.scores[vs]?.runs ?? 0)
    if (by > 0) wins.push({ text: r.text, by, vs })
  }
  wins.sort((a, b) => b.by - a.by)
  return { biggest: wins[0] ?? null, narrowest: wins.length > 1 ? wins[wins.length - 1] : null }
}

export function buildRecap(season: Season, review: SeasonReview, past: SeasonReview[], teamName: (id: string) => string): RecapCard[] {
  const cards: RecapCard[] = []
  const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
  cards.push({ kind: 'intro', title: `${review.year} season`, big: `${review.won} won, ${review.lost} lost${review.tied ? `, ${review.tied} tied` : ''}`, lines: [`${review.teamName} finished ${ord(review.rank)} of ${review.teams}`, `${review.played} matches played`] })
  if (review.titles.length > 0) cards.push({ kind: 'titles', title: review.titles.length === 1 ? 'Champions!' : 'Trophy winners!', big: review.titles.length === 1 ? review.titles[0] : `${review.titles.length} titles`, lines: review.titles.length === 1 ? ['You lifted the trophy this year.'] : review.titles })
  const bat = [...review.players].filter((p) => p.bat && p.bat.runs > 0).sort((a, b) => b.bat!.runs - a.bat!.runs)[0]
  if (bat?.bat) cards.push({ kind: 'bat', title: 'Top run-scorer', big: `${bat.bat.runs} runs`, playerId: bat.id, lines: [bat.name, `High score ${bat.bat.high}${bat.bat.highNotOut ? '*' : ''} · ${bat.bat.fifties} fifties · ${bat.bat.hundreds} hundreds`, `${bat.bat.fours} fours and ${bat.bat.sixes} sixes`] })
  const bowl = [...review.players].filter((p) => p.bowl && p.bowl.wickets > 0).sort((a, b) => b.bowl!.wickets - a.bowl!.wickets)[0]
  if (bowl?.bowl) cards.push({ kind: 'bowl', title: 'Top wicket-taker', big: `${bowl.bowl.wickets} wickets`, playerId: bowl.id, lines: [bowl.name, `Best figures ${bowl.bowl.best}${bowl.bowl.fiveW ? ` · ${bowl.bowl.fiveW} five-wicket ${bowl.bowl.fiveW === 1 ? 'haul' : 'hauls'}` : ''}`, `${bowl.bowl.maidens} maidens`] })
  const w = winsOf(season)
  if (w.biggest) cards.push({ kind: 'wins', title: 'Biggest win', big: `by ${w.biggest.by} runs`, lines: [`against ${teamName(w.biggest.vs)}`, ...(w.narrowest && w.narrowest.by !== w.biggest.by ? [`Closest call: by ${w.narrowest.by} ${w.narrowest.by === 1 ? 'run' : 'runs'} against ${teamName(w.narrowest.vs)}`] : [])] })
  const ms = milestonesReached(past, review)
  if (ms.length > 0) cards.push({ kind: 'milestones', title: 'Career milestones', big: ms.length === 1 ? ms[0].text : `${ms.length} milestones`, lines: ms.slice(0, 5).map((m) => `${m.name}: ${m.text}`), more: ms.slice(0, 4).map((m) => m.playerId) })
  const risers = [...(review.progress ?? [])].filter((p) => p.after > p.before).sort((a, b) => b.after - b.before - (a.after - a.before)).slice(0, 3)
  if (risers.length > 0) cards.push({ kind: 'risers', title: 'Rising stars', big: `+${risers[0].after - risers[0].before} rating`, lines: risers.map((p) => `${p.name}: ${p.before} to ${p.after}`), more: risers.map((p) => p.id) })
  return cards
}
