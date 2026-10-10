import type { LiveMatch, SessionFile } from '../store/useStore'
import type { Team } from '../types'

/**
 * Backup and transfer. Everything the game remembers lives in this browser, so a backup file is how
 * you keep a safe copy or move to another device. The file is plain JSON.
 */
export const BACKUP_APP = 'fantasy-cric-sim'
export const BACKUP_VERSION = 1

export interface BackupData {
  customTeams: Team[]
  overrides: Record<string, Team>
  sessions: SessionFile[]
  activeSessionId: string | null
  liveMatch: LiveMatch | null
}

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  data: BackupData
}

export const emptyData = (): BackupData => ({ customTeams: [], overrides: {}, sessions: [], activeSessionId: null, liveMatch: null })

export function buildBackup(data: BackupData, now = new Date()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data }
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `fantasy-cric-sim-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`
}

export interface BackupSummary {
  sessions: { name: string; year: number; played: number; total: number; team?: string; difficulty?: string; years?: number }[]
  customTeams: number
  editedTeams: number
  liveMatch: { teams: string; format: string } | null
}

export function summarize(d: BackupData): BackupSummary {
  return {
    sessions: d.sessions.map((s) => ({ name: s.name, year: s.season.year, played: Object.keys(s.season.results).length, total: s.season.fixtures.length, difficulty: s.season.difficulty, years: (s.reviews?.length ?? 0) + 1 })),
    customTeams: d.customTeams.length,
    editedTeams: Object.keys(d.overrides).length,
    liveMatch: d.liveMatch && !d.liveMatch.finished ? { teams: `${d.liveMatch.teamA.name} v ${d.liveMatch.teamB.name}`, format: d.liveMatch.format.toUpperCase() } : null,
  }
}

export const isEmpty = (d: BackupData) => !d.customTeams.length && !Object.keys(d.overrides).length && !d.sessions.length && !d.liveMatch

// ---- Checking a file before we trust it ----------------------------------------

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isStr = (x: unknown): x is string => typeof x === 'string'
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const ROLES = ['BAT', 'BOWL', 'AR', 'WK']

function isPlayer(p: unknown): boolean {
  if (!isObj(p) || !isStr(p.id) || !isStr(p.name) || !ROLES.includes(p.role as string) || !isObj(p.batting) || !isNum(p.fielding)) return false
  const b = p.batting
  if (![b.technique, b.power, b.temperament, b.running].every(isNum)) return false
  if (p.bowling !== null && p.bowling !== undefined) {
    const w = p.bowling
    if (!isObj(w) || !isStr(w.type) || ![w.accuracy, w.variation, w.stamina].every(isNum)) return false
  }
  return Array.isArray(p.traits)
}

export function isTeam(t: unknown): t is Team {
  return isObj(t) && isStr(t.id) && isStr(t.name) && isStr(t.short) && isObj(t.colors) && isStr(t.colors.primary) && isStr(t.colors.secondary) &&
    Array.isArray(t.players) && t.players.length >= 11 && t.players.every(isPlayer) && isStr(t.captainId)
}

function isSeasonLike(x: unknown): boolean {
  return isObj(x) && isNum(x.year) && isStr(x.today) && Array.isArray(x.fixtures) && Array.isArray(x.competitions) && Array.isArray(x.teamIds) && isObj(x.results)
}

function isSession(s: unknown): s is SessionFile {
  if (!isObj(s) || !isStr(s.id) || !isStr(s.name) || !isObj(s.season)) return false
  const x = s.season
  return isNum(x.year) && isStr(x.today) && Array.isArray(x.fixtures) && Array.isArray(x.competitions) && Array.isArray(x.teamIds) && isObj(x.results) &&
    x.fixtures.every((f) => isObj(f) && isStr(f.id) && isStr(f.date) && isStr(f.competitionId))
}

function isLive(m: unknown): m is LiveMatch {
  return isObj(m) && isStr(m.id) && isStr(m.key) && isStr(m.url) && isTeam(m.teamA) && isTeam(m.teamB) && isNum(m.seed) && Array.isArray(m.actions) && (m.format === 't20' || m.format === 'odi')
}

export type ParseResult = { ok: true; backup: BackupFile; summary: BackupSummary; skipped: string[] } | { ok: false; error: string }

/** Reads a backup file's text. Anything that doesn't check out is left out and reported, never half-loaded. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't valid JSON, so it can't be a backup from this game." }
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) return { ok: false, error: "This doesn't look like a Fantasy Cric Sim backup file." }
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION) return { ok: false, error: 'This backup was made by a newer version of the game. Update the game first, then import it.' }
  if (!isObj(raw.data)) return { ok: false, error: 'The backup is missing its data.' }
  const d = raw.data
  const skipped: string[] = []
  const data = emptyData()

  if (Array.isArray(d.customTeams)) {
    for (const t of d.customTeams) {
      if (isTeam(t)) data.customTeams.push({ ...t, isCustom: true })
      else skipped.push(`a custom team${isObj(t) && isStr(t.name) ? ` ("${t.name}")` : ''} that wasn't valid`)
    }
  }
  if (isObj(d.overrides)) {
    for (const [id, t] of Object.entries(d.overrides)) {
      if (isTeam(t) && t.id === id) data.overrides[id] = { ...t, isCustom: false }
      else skipped.push(`the edits to team "${id}" that weren't valid`)
    }
  }
  if (Array.isArray(d.sessions)) {
    for (const s of d.sessions) {
      if (isSession(s)) {
        const x = s.season as unknown as Record<string, unknown>
        const difficulty = ['easy', 'normal', 'hard', 'legend'].includes(x.difficulty as string) ? (x.difficulty as 'easy' | 'normal' | 'hard' | 'legend') : 'normal'
        data.sessions.push({
          ...s,
          reviews: Array.isArray((s as unknown as { reviews?: unknown }).reviews) ? s.reviews : [],
          history: Array.isArray(s.history) ? s.history.filter((h) => isSeasonLike(h)) : [],
          season: { ...s.season, roster: Array.isArray(s.season.roster) ? s.season.roster : [], myTeamId: isStr(x.myTeamId) ? x.myTeamId : null, difficulty },
        })
      }
      else skipped.push(`a session${isObj(s) && isStr(s.name) ? ` ("${s.name}")` : ''} that wasn't valid`)
    }
  }
  data.activeSessionId = isStr(d.activeSessionId) && data.sessions.some((s) => s.id === d.activeSessionId) ? d.activeSessionId : (data.sessions[data.sessions.length - 1]?.id ?? null)
  if (d.liveMatch) {
    if (isLive(d.liveMatch)) data.liveMatch = d.liveMatch
    else skipped.push('the match in progress, which wasn\'t valid')
  }
  const backup: BackupFile = { app: BACKUP_APP, version: raw.version, exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '', data }
  return { ok: true, backup, summary: summarize(data), skipped }
}

// ---- Bringing it in --------------------------------------------------------------

export type ImportMode = 'merge' | 'replace'

export interface ImportReport {
  sessionsAdded: number
  teamsAdded: number
  editsAdded: number
  /** Things already on this device that were left alone. */
  teamsKept: number
  editsKept: number
  liveMatch: 'taken' | 'kept' | 'none'
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/**
 * "replace": the device ends up exactly as the file says.
 * "merge":   add what's new and keep what's here. Where both have the same team, this device wins.
 *            A session that clashes on id comes in as a separate copy, so nothing is ever overwritten.
 */
export function applyBackup(current: BackupData, incoming: BackupData, mode: ImportMode): { next: BackupData; report: ImportReport } {
  if (mode === 'replace') {
    return {
      next: structuredClone(incoming),
      report: { sessionsAdded: incoming.sessions.length, teamsAdded: incoming.customTeams.length, editsAdded: Object.keys(incoming.overrides).length, teamsKept: 0, editsKept: 0, liveMatch: incoming.liveMatch ? 'taken' : 'none' },
    }
  }
  const inc = structuredClone(incoming)
  const have = new Set(current.customTeams.map((t) => t.id))
  const newTeams = inc.customTeams.filter((t) => !have.has(t.id))
  const newEdits = Object.entries(inc.overrides).filter(([id]) => !(id in current.overrides))
  const sessionIds = new Set(current.sessions.map((s) => s.id))
  const addedSessions = inc.sessions.map((s) => {
    if (!sessionIds.has(s.id)) return s
    return { ...s, id: newId('session'), name: `${s.name} (imported)` }
  })
  const takeLive = !!inc.liveMatch && (!current.liveMatch || current.liveMatch.finished)
  const next: BackupData = {
    customTeams: [...current.customTeams, ...newTeams],
    overrides: { ...current.overrides, ...Object.fromEntries(newEdits) },
    sessions: [...current.sessions, ...addedSessions],
    activeSessionId: current.activeSessionId && current.sessions.some((s) => s.id === current.activeSessionId) ? current.activeSessionId : (addedSessions[addedSessions.length - 1]?.id ?? current.activeSessionId),
    liveMatch: takeLive ? inc.liveMatch : current.liveMatch,
  }
  return {
    next,
    report: {
      sessionsAdded: addedSessions.length, teamsAdded: newTeams.length, editsAdded: newEdits.length,
      teamsKept: inc.customTeams.length - newTeams.length, editsKept: Object.keys(inc.overrides).length - newEdits.length,
      liveMatch: takeLive ? 'taken' : inc.liveMatch ? 'kept' : 'none',
    },
  }
}
