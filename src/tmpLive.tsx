import './index.css'
let vt = 0
const cbs = new Map<number, FrameRequestCallback>()
let rid = 1
performance.now = () => vt
window.requestAnimationFrame = (cb) => { const id = rid++; cbs.set(id, cb); return id }
window.cancelAnimationFrame = (id) => { cbs.delete(id) }
const stepTo = (ms: number) => { while (vt < ms) { vt += 16; const run = [...cbs.entries()]; cbs.clear(); run.forEach(([, cb]) => cb(vt)) } }
import { createRoot } from 'react-dom/client'
import { BUILT_IN_TEAMS } from './data/teams'
import { Match } from './engine/match'
import { fieldPlan } from './components/match/fieldSets'
import { BroadcastView } from './components/match/BroadcastView'
import { placeFielders } from './components/match/Stage'
import { DEFAULT_LOOK } from './engine/stadium'

const q = new URLSearchParams(location.search)
const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: Number(q.get('seed') ?? 3) })
m.playMatch()
const inn = m.innings[0]
const want = q.get('kind')
const pick = (e: (typeof inn.log)[number]) => want === 'six' ? e.boundary === 6 : want === 'four' ? e.boundary === 4 : want === 'wicket' ? !!e.wicket : want === 'caught' ? e.wicket?.kind === 'caught' : want === 'dot' ? e.total === 0 && !e.extraType : true
const evs = inn.log.filter(pick)
const ev = evs[Number(q.get('n') ?? 0) % evs.length]
const bowlSide = m.sides[1 - inn.battingSide], batSide = m.sides[inn.battingSide]
const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: m.player(ev.bowlerId).bowling?.type ?? null, hand: 'R' } as never)
const fielders = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
createRoot(document.getElementById('root')!).render(
  <BroadcastView event={ev} striker={m.player(ev.strikerId)} nonStriker={m.player(ev.nonStrikerId)} bowler={m.player(ev.bowlerId)} battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={fielders} look={DEFAULT_LOOK} replay={q.get('cam') ? { cam: q.get('cam') as 'side' | 'high' | 'stump', slowMo: false } : null} />,
)
setTimeout(() => stepTo(Number(q.get('at') ?? 0)), 100)
document.title = ev.wicket?.kind ?? ''
