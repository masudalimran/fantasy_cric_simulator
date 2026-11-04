// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { markPatchesRead, resetPatchesRead } from './patchSeen'
import App from './App'
import { BUILT_IN_TEAMS } from './data/teams'
import { simThrough } from './season/results'
import { sessionTeam } from './season/progression'
import { useStore } from './store/useStore'
import { paths } from './routes'

/**
 * A page that crashes on its first draw (a wrong hook order, something missing in an older save) is caught here without a browser:
 * every address in the app is drawn (in a pretend phone screen) with a career that has some matches played. It cannot catch what only goes wrong on a tap or in a
 * browser (canvas, sound), so the match screens are still worth opening by hand after changing them.
 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// a phone-sized screen: what jsdom lacks is stood in for (no canvas, no sound, no real layout)
window.matchMedia = ((q: string) => ({ matches: /max-width: 767px/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia
window.scrollTo = (() => {}) as typeof window.scrollTo
Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo
Element.prototype.scrollBy = (() => {}) as typeof Element.prototype.scrollBy
Element.prototype.scrollIntoView = (() => {}) as typeof Element.prototype.scrollIntoView
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }

/** Draws the whole app at an address, lets its effects run, and returns the text on the screen. */
function draw(url: string): string {
  const box = document.createElement('div')
  document.body.appendChild(box)
  const root = createRoot(box)
  act(() => { root.render(<MemoryRouter initialEntries={[url]}><App /></MemoryRouter>) })
  const text = box.textContent ?? ''
  act(() => { root.unmount() })
  box.remove()
  return text
}

describe('every page draws without crashing', () => {
  beforeAll(() => {
    const st = useStore.getState()
    const id = st.createSession({ name: 'Smoke', year: 2030, teams: BUILT_IN_TEAMS, seed: 99, myTeamId: 'bleach', difficulty: 'normal' })
    st.openSession(id)
    useStore.getState().updateSeason((s) => {
      const map = new Map(BUILT_IN_TEAMS.map((t) => [t.id, sessionTeam(t, s)]))
      const dates = s.fixtures.map((f) => f.date).sort()
      return simThrough(s, dates[Math.min(dates.length - 1, 30)], map)
    })
  })

  const urls = [
    paths.home, paths.teams, paths.play, paths.sessions, paths.newSession, paths.news, paths.backup,
    paths.session(), paths.competitions, paths.results, paths.stats, paths.market, paths.club, paths.tree, paths.review, paths.sessionSquad,
    paths.careerTeam('bleach'), paths.team('bleach'), paths.squad('bleach'), paths.editTeam('bleach'), paths.newTeam,
  ]
  for (const url of urls) {
    it(`draws ${url}`, () => {
      const html = draw(url)
      expect(html.length).toBeGreaterThan(100)
      expect(html).not.toContain("We couldn't find that")
    })
  }

  it('really draws the page it was asked for, with the career open', () => {
    expect(draw(paths.club)).toContain('Worth doing now')
    expect(draw(paths.tree)).toContain('Passive tree')
    expect(draw(paths.news)).toContain('Fine-tuning')
    expect(draw(paths.session())).toContain('Smoke')
  })

  it('with no career open, the career pages send you to the list of careers instead of crashing', () => {
    useStore.setState({ activeSessionId: null })
    for (const url of [paths.club, paths.tree, paths.stats, paths.market]) expect(() => draw(url)).not.toThrow()
  })
})

describe('the what\'s new popup', () => {
  afterEach(() => { vi.useRealTimers(); markPatchesRead() })
  const open = (url: string) => {
    vi.useFakeTimers()
    const box = document.createElement('div')
    document.body.appendChild(box)
    const root = createRoot(box)
    act(() => { root.render(<MemoryRouter initialEntries={[url]}><App /></MemoryRouter>) })
    act(() => { vi.advanceTimersByTime(1500) })
    const text = document.body.textContent ?? ''
    act(() => { root.unmount() })
    box.remove()
    return text
  }
  it('opens by itself for someone who has not read the updates, newest first', () => {
    resetPatchesRead()
    const text = open(paths.home)
    expect(text).toContain("What's new")
    expect(text).toContain('Fine-tuning')
    expect(text).toContain('1 of ')
  })
  it('stays closed once the updates are read, and never opens in the middle of a match', () => {
    markPatchesRead()
    expect(open(paths.home)).not.toContain("What's new")
    resetPatchesRead()
    expect(open('/match/t20/bleach-vs-naruto/1')).not.toContain("What's new")
  })
})
