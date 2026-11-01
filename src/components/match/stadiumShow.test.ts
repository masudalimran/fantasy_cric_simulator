import { describe, expect, it } from 'vitest'
import { camWide, ROPE } from './broadcast'
import { solve } from './bodyPose'
import { slopePoint } from './crowdDraw'
import { ceremonyLine, ceremonyPerson, hostPos, turnsOf, balconyPose, balconySpot, cameraAt, captainPos, cheerAngle, cheerleaders, coinAt, confettiAt, coverAt, crewPos, crowdAt, ENTRANCE, gatePos, MILESTONE, huddlePerson, huddleSpot, hugJoiners, hugPerson, hugSpot, landingBall, lineSpot, LINEUP, linePerson, photoFlashes, ringPt, screenAt, SHOW_SECONDS, sparksAt, startKey, towersAt, trophyPerson, trophySpot, walkerPos, walkoffPos, WALKOFF, type ShowKind, type StadiumShow } from './stadiumShow'

const KINDS: ShowKind[] = ['cheer', 'stands', 'huddle', 'fireworks', 'social', 'entrance', 'trophy', 'board', 'studio', 'flyover', 'bowler', 'hug', 'walkoff', 'landing', 'lights', 'lineup', 'motm', 'review', 'rain', 'milestone', 'ceremony']
const FROM_LIVE = KINDS.filter((k) => k !== 'flyover' && k !== 'lineup') // (the fly-over is the other way round: it ENDS at the live camera)
const show = (kind: ShowKind, seed: number, variant?: StadiumShow['variant']): StadiumShow => ({ kind, variant, seed, focus: { x: 10, y: 0, z: -14 }, celebrant: 2, landing: { x: 80, y: 6, z: -4 }, caught: true, colors: ['#f97316', '#1d4ed8'], sign: '6', name: 'Goku Son', word: 'U7W', why: 'boundary' })
const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('the stadium shows', () => {
  it('every show starts exactly where the live broadcast camera is, so the picture does not jump', () => {
    for (const kind of FROM_LIVE) for (let seed = 1; seed <= 12; seed++) {
      const c = cameraAt(show(kind, seed, kind === 'cheer' ? 'pompom' : undefined), 0)
      expect(dist(c.p, camWide.p)).toBeLessThan(0.01)
      expect(Math.abs(c.hfov - camWide.hfov)).toBeLessThan(0.01)
      expect(Math.abs(c.yaw - camWide.yaw)).toBeLessThan(0.02)
      expect(Math.abs(c.pitch - camWide.pitch)).toBeLessThan(0.02)
    }
    expect(startKey().hfov).toBe(camWide.hfov)
  })
  it('the fly-over comes down from high above the stadium and ends exactly on the live camera, so the first ball follows on', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const T = SHOW_SECONDS.flyover
      const first = cameraAt(show('flyover', seed), 0)
      expect(first.p.y).toBeGreaterThan(40)
      const last = cameraAt(show('flyover', seed), T)
      expect(dist(last.p, camWide.p)).toBeLessThan(0.01)
      expect(Math.abs(last.hfov - camWide.hfov)).toBeLessThan(0.01)
      expect(Math.abs(last.yaw - camWide.yaw)).toBeLessThan(0.02)
      expect(Math.abs(last.pitch - camWide.pitch)).toBeLessThan(0.02)
    }
  })
  it('the new batsman comes out of the gate in the far stand, walks the length of the ground and stops at his end of the crease', () => {
    for (const left of [false, true]) {
      const s: StadiumShow = { ...show('entrance', 4), left }
      const g = gatePos()
      expect(dist(walkerPos(s, 0), g)).toBeLessThan(0.7) // (at the gate, a little to one side of its middle)
      expect(dist(walkerPos(s, ENTRANCE.start), walkerPos(s, 0))).toBeLessThan(0.01)
      let prev = g.z
      for (let t = ENTRANCE.start; t <= ENTRANCE.start + ENTRANCE.walk; t += 0.1) { const w = walkerPos(s, t); expect(w.z).toBeLessThanOrEqual(prev + 1e-9); prev = w.z }
      const end = walkerPos(s, SHOW_SECONDS.entrance)
      expect(Math.sign(end.x)).toBe(left ? -1 : 1)
      expect(end.z).toBeLessThan(0)
      expect(end.z).toBeGreaterThan(-2)
      // he does not run faster than a sprint
      let top = 0
      for (let t = ENTRANCE.start; t < ENTRANCE.start + ENTRANCE.walk; t += 0.05) top = Math.max(top, dist(walkerPos(s, t + 0.05), walkerPos(s, t)) / 0.05)
      expect(top).toBeLessThan(16)
    }
  })
  it('the trophy celebration: the winners run in, jump, the captain lifts the cup, confetti and fireworks fill the air', () => {
    const s = show('trophy', 2)
    const n = 11
    for (let i = 0; i < n; i++) {
      expect(trophyPerson(0, i, n).arrived).toBe(false)
      expect(trophyPerson(4, i, n).arrived).toBe(true)
      expect(dist(trophyPerson(4, i, n).pos, { ...trophySpot(i, n), y: trophyPerson(4, i, n).pos.y })).toBeLessThan(0.01)
    }
    expect(trophyPerson(1, 0, n).lift).toBe(0)
    expect(trophyPerson(5, 0, n).lift).toBe(1)
    expect(confettiAt(s, 1).length).toBe(0)
    expect(confettiAt(s, 4.5).length).toBeGreaterThan(200)
    for (const c of confettiAt(s, 6)) { expect(Number.isFinite(c.p.x + c.p.y + c.p.z)).toBe(true); expect(c.p.y).toBeGreaterThanOrEqual(0) }
    expect(confettiAt(show('cheer', 2, 'pompom'), 4.5).length).toBe(0)
    expect(sparksAt(s, 5).sparks.length).toBeGreaterThan(30)
    expect(sparksAt(show('cheer', 2, 'pompom'), 3).sparks.length).toBe(0) // only the fireworks and the trophy have a sky to light up
    expect(sparksAt(show('stands', 2), 3).flash).toBe(0)
  })
  it('the notices on the giant screen: the timeout, the super over and the studio', () => {
    const board = { title: 'STRATEGIC TIMEOUT', sub: 'After 6 overs', big: '54/2', rows: [{ label: 'Run rate', value: '9.0' }] }
    for (const kind of ['board', 'studio'] as const) {
      const sc = screenAt({ ...show(kind, 3), board }, 3)!
      expect(sc.board!.title).toBe('STRATEGIC TIMEOUT')
      expect(screenAt(show(kind, 3), 3)).toBeNull() // (no notice, no screen)
      expect(crowdAt({ ...show(kind, 3), board }, 3)!.k).toBeGreaterThan(0.4)
    }
  })
  it('the camera moves smoothly: no jumps from one moment to the next, and it stays inside the stadium', () => {
    for (const kind of KINDS) for (const seed of [3, 8, 21]) {
      const s = { ...show(kind, seed, kind === 'cheer' ? (seed === 3 ? 'pompom' : seed === 8 ? 'cards' : 'pyramid') : undefined), left: seed === 8 }
      let prev = cameraAt(s, 0)
      for (let t = 0.05; t <= SHOW_SECONDS[kind]; t += 0.05) {
        const c = cameraAt(s, t)
        const cut = (kind === 'walkoff' && Math.abs(t - WALKOFF.cut) < 0.08) || (kind === 'milestone' && Math.abs(t - MILESTONE.cut) < 0.08) // (a cut to another camera: the picture flashes white)
        if (!cut) expect(dist(c.p, prev.p), `${kind} ${seed} at ${t.toFixed(2)}`).toBeLessThan(kind === 'lineup' || kind === 'flyover' ? 6 : 4.2) // (the swoops from high above the stadium are the fast ones)
        if (!cut) expect(Math.abs(c.hfov - prev.hfov), `${kind} ${seed} at ${t.toFixed(2)} (zoom)`).toBeLessThan(0.06)
        expect(Number.isFinite(c.yaw + c.pitch + c.hfov)).toBe(true)
        expect(Math.hypot((c.p.x - ROPE.cx) / (ROPE.rx * 1.6), (c.p.z - ROPE.cz) / (ROPE.rz * 1.6))).toBeLessThan(1)
        expect(c.p.y).toBeGreaterThan(0.5)
        prev = c
      }
    }
  })
  it('the stands cam ends up looking at the crowd, and the card stunt at the card block', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const c = crowdAt(show('stands', seed), 3)!
      expect(c.signs?.length).toBe(2)
      expect(c.a1).toBeGreaterThan(c.a0)
      const k = crowdAt(show('cheer', seed, 'cards'), 6)!
      expect(k.cards!.grid.length).toBe(7)
      expect(k.cards!.grid[0].length).toBe(17) // three letters of five dots and a gap between
      expect(k.cards!.a0).toBeGreaterThan(k.a0)
      expect(crowdAt(show('huddle', seed), 3)).toBeNull()
      expect(crowdAt(show('fireworks', seed), 3)).toBeNull()
    }
    const p = slopePoint(0.5, 0.5)
    expect(Math.hypot((p.x - ROPE.cx) / ROPE.rx, (p.z - ROPE.cz) / ROPE.rz)).toBeGreaterThan(1.03)
  })
  it('the giant screen shows the fan wall, and the posts come in one after another', () => {
    const s: StadiumShow = { ...show('social', 3), hashtag: 'SORvHLS', posts: [1, 2, 3].map((n) => ({ name: 'Fan', handle: '@fan' + n, side: 0 as const, text: 'Great shot', likes: 100, shares: 10, replies: 1, age: '1m' })) }
    expect(screenAt(s, 3)!.posts.length).toBe(3)
    expect(screenAt(s, 3)!.hashtag).toBe('SORvHLS')
    expect(screenAt(show('stands', 3), 3)).toBeNull()
    expect(screenAt(show('social', 3), 3)).toBeNull() // (no posts, no screen)
    expect(crowdAt(s, 3)!.k).toBeGreaterThan(0.5) // the stands under the screen are lively
  })
  it('the fireworks go up and burst in the sky above the stands, glow and fade away', () => {
    const s = show('fireworks', 5)
    let burst = 0, maxFlash = 0
    for (let t = 0; t <= SHOW_SECONDS.fireworks; t += 0.1) {
      const { sparks, flash } = sparksAt(s, t)
      maxFlash = Math.max(maxFlash, flash)
      for (const sp of sparks) { expect(sp.a).toBeGreaterThanOrEqual(0); expect(sp.a).toBeLessThanOrEqual(1); expect(sp.p.y).toBeGreaterThan(-40) }
      if (sparks.length > 40) burst++
    }
    expect(burst).toBeGreaterThan(20)
    expect(maxFlash).toBeGreaterThan(0.5)
    expect(sparksAt(s, 0).sparks.length).toBe(0) // quiet at the start
  })
  it('the cheerleaders stand just inside the rope, six of them, and the pyramid has three, two and one on top', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = ringPt(cheerAngle(seed), 0.945)
      for (const variant of ['pompom', 'flags', 'pyramid'] as const) for (const t of [0.5, 2, 3.5, 4.5, 6.5]) {
        const d = cheerleaders(show('cheer', seed, variant), t)
        expect(d.length).toBe(6)
        for (const x of d) {
          expect(Math.hypot(x.pos.x - g.x, x.pos.z - g.z)).toBeLessThan(6)
          const sk = solve(x.pose)
          for (const v of Object.values(sk)) if (v) expect(Number.isFinite(v.x + v.y)).toBe(true)
        }
      }
      const top = cheerleaders(show('cheer', seed, 'pyramid'), 5)
      const lifts = top.map((x) => x.pos.y).sort((a, b) => a - b)
      expect(lifts[0]).toBeLessThan(0.1)
      expect(lifts[5]).toBeGreaterThan(1.6) // the one on top
      expect(lifts.filter((l) => l > 0.8 && l < 1.4).length).toBe(2)
    }
  })
  it('the huddle: they walk in from where they stood, form a ring, and jump when it breaks', () => {
    const s = show('huddle', 4)
    const n = 12
    for (let i = 0; i < n; i++) {
      const from = { x: -30 + i * 5, y: 0, z: 10 }
      const start = huddlePerson(s, 0, i, n, from)
      expect(dist(start.pos, from)).toBeLessThan(0.01)
      const mid = huddlePerson(s, 3.6, i, n, from)
      expect(dist(mid.pos, huddleSpot(s, i, n))).toBeLessThan(0.01)
      expect(mid.walking).toBe(false)
      const end = huddlePerson(s, 6, i, n, from)
      expect(end.pose).not.toBeNull()
    }
  })

  it('the wicket: the nearest six run to the celebrant and jump together; the batsman walks to the gate and is gone', () => {
    const s = show('hug', 3)
    const froms = Array.from({ length: 11 }, (_, i) => ({ x: -30 + i * 6, y: 0, z: -14 + (i % 3) * 5 }))
    const join = hugJoiners(s, froms, 2)
    expect(join.length).toBe(6)
    expect(join).not.toContain(2)
    for (const i of join) {
      const to = hugSpot(s, join.indexOf(i), join.length)
      expect(hugPerson(0, froms[i], to, true).arrived).toBe(false)
      const end = hugPerson(4, froms[i], to, true)
      expect(end.arrived).toBe(true)
      expect(dist({ ...end.pos, y: 0 }, { ...to, y: 0 })).toBeLessThan(0.01)
    }
    const w = show('walkoff', 3)
    expect(walkoffPos(w, 0)).not.toBeNull()
    expect(walkoffPos(w, WALKOFF.end + 0.1)).toBeNull()
    expect(walkoffPos(w, WALKOFF.cut)!.z).toBeGreaterThan(walkoffPos(w, WALKOFF.start)!.z)
  })
  it('a six comes down at the spot it was given: caught in the hands, bouncing down the seats, or away over the roof', () => {
    const base = show('landing', 5)
    for (let i = 0; i < 3; i++) {
      const s: StadiumShow = { ...base, caught: i === 0, gone: i === 2 }
      expect(landingBall(s, 0)).toBeNull()
      let maxY = 0
      for (let t = 0.6; t < SHOW_SECONDS.landing; t += 0.1) { const b = landingBall(s, t); if (b) { expect(Number.isFinite(b.p.x + b.p.y + b.p.z)).toBe(true); maxY = Math.max(maxY, b.p.y) } }
      expect(maxY).toBeGreaterThan(8)
      if (i === 2) expect(landingBall(s, 4.5)!.p.y).toBeGreaterThan(30)
      else expect(landingBall(s, 4.5)!.p.y).toBeLessThan(20)
    }
    const c = crowdAt(show('landing', 5), 3)!
    expect(c.fanReact!.caught).toBe(true)
    expect(crowdAt({ ...show('landing', 5), gone: true }, 3)!.fanReact).toBeUndefined()
  })
  it('the floodlights come on tower by tower while the evening gets darker', () => {
    expect(towersAt(0).on.every((v) => v === 0)).toBe(true)
    expect(towersAt(0).dusk).toBe(0)
    expect(towersAt(8).on.every((v) => v === 1)).toBe(true)
    expect(towersAt(8).dusk).toBe(1)
    expect(towersAt(3.2).on[0]).toBeGreaterThan(towersAt(3.2).on[1])
  })
  it('the toss and line-up: the captains meet, the coin goes up and comes down, the teams line up facing the camera', () => {
    for (const side of [0, 1] as const) {
      const home = lineSpot(side, 0)
      expect(Math.abs(captainPos(side, LINEUP.coin, home).x)).toBeLessThan(2)
      expect(dist(captainPos(side, 12, home), home)).toBeLessThan(0.01)
      for (let i = 0; i < 11; i++) { expect(linePerson(side, i, 0).arrived).toBe(false); expect(linePerson(side, i, 12).arrived).toBe(true); expect(Math.sign(lineSpot(side, i).x)).toBe(side === 0 ? -1 : 1) }
    }
    expect(coinAt(1)).toBeNull()
    expect(coinAt(LINEUP.coin + 0.7)!.y).toBeGreaterThan(2.5)
    expect(coinAt(LINEUP.coinEnd + 0.5)).toBeNull()
  })
  it('the rain: the covers go over the pitch from the bowler end and the ground staff run with them; the dressing room stands and claps; the photographers flash', () => {
    expect(coverAt(0)).toBe(0); expect(coverAt(9)).toBe(1)
    for (let i = 0; i < 6; i++) { expect(crewPos(i, 6, 0).z).toBeLessThan(crewPos(i, 6, 7).z + 30); expect(Number.isFinite(crewPos(i, 6, 3).x)).toBe(true) }
    for (let i = 0; i < 8; i++) { const sp = balconySpot(i, 8); expect(sp.y).toBeGreaterThan(1); expect(balconyPose(1, i).hip.y).toBeGreaterThan(balconyPose(6, i).hip.y) }
    let flashes = 0
    for (let t = 1.5; t < 8; t += 0.1) flashes += photoFlashes(4, t).length
    expect(flashes).toBeGreaterThan(30)
  })

  it('the two openers come out side by side and stop a couple of metres apart at the crease; the camera goes between them', () => {
    const s: StadiumShow = { ...show('entrance', 6), pair: true }
    for (const t of [ENTRANCE.start, 4, 6, 12]) { const a = walkerPos(s, t, 0), b = walkerPos(s, t, 1); expect(Math.abs(a.x - b.x)).toBeGreaterThan(0.5); expect(Math.abs(a.x - b.x)).toBeLessThan(3); expect(Math.abs(a.z - b.z)).toBeLessThan(1) }
    expect(Math.abs(walkerPos(s, 12, 0).x - walkerPos(s, 12, 1).x)).toBeGreaterThan(1.5)
    const c = cameraAt(s, 4)
    expect(Number.isFinite(c.yaw + c.pitch + c.hfov)).toBe(true)
  })

  it('the ceremony: the host walks on, the teams stand at the two sides, each speaker goes up to the microphone in his turn and the Man of the Match stays', () => {
    const script = [{ at: 1, end: 2, who: 'host' as const, text: 'x' }]
    const s: StadiumShow = { ...show('ceremony', 4), ceremony: { script, winCaptainId: 'a3', loseCaptainId: 'b2', motmId: 'a5', cheque: '5,000 COINS', title: 'Cup', hostName: 'Zoe' } }
    expect(hostPos(0).x).toBeLessThan(hostPos(5).x)
    expect(Math.hypot(hostPos(20).x - hostPos(8).x, hostPos(20).z - hostPos(8).z)).toBeLessThan(0.01)
    const line = (side: 0 | 1, i: number) => ceremonyLine(side, i)
    expect(line(0, 0).x).toBeLessThan(-5); expect(line(1, 0).x).toBeGreaterThan(5)
    const early = ceremonyPerson(s, 0, 'a3', line(0, 3), 0, 3)
    expect(early.arrived).toBe(false)
    const lined = ceremonyPerson(s, 8, 'a1', line(0, 1), 0, 1)
    expect(lined.arrived).toBe(true); expect(lined.onStage).toBe(false)
    const cap = turnsOf(s, 'a3')[0]
    const onMic = ceremonyPerson(s, cap.start + 3, 'a3', line(0, 3), 0, 3)
    expect(onMic.onStage).toBe(true); expect(Math.abs(onMic.pos.x)).toBeLessThan(3)
    const back = ceremonyPerson(s, cap.end + 3, 'a3', line(0, 3), 0, 3)
    expect(back.onStage).toBe(false); expect(Math.abs(back.pos.x - line(0, 3).x)).toBeLessThan(0.01)
    expect(ceremonyPerson(s, 28, 'a5', line(0, 5), 0, 5).onStage).toBe(true) // the Man of the Match stays up
    expect(turnsOf(s, 'nobody')).toEqual([])
  })
})
