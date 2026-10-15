import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '../routes'
import { overall } from '../data/builders'
import { generatePlayer, emptyTeamDraft, newPlayerId } from '../data/generate'
import { playerImage } from '../data/images'
import { keeperIn, validateSquad } from '../data/squad'
import { ALL_TRAITS } from '../data/traits'
import { useStore, useTeams } from '../store/useStore'
import type { BowlType, Player, Role, Team, Trait } from '../types'
import { GENERIC_EMBLEMS } from './emblems'
import { PlayerAvatar, RatingBadge, ROLE_LABEL, TeamCrest } from './ui'

const ROLES: Role[] = ['BAT', 'WK', 'AR', 'BOWL']
const BOWL_TYPES: BowlType[] = ['fast', 'medium', 'offspin', 'legspin', 'leftspin']
const MAX_PLAYERS = 20

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="w-24 shrink-0 cursor-help" data-gloss={label}>{label}</span>
      <input type="range" min={1} max={100} value={value} onChange={(e) => onChange(+e.target.value)} className="flex-1" />
      <span className="w-7 text-right tabular-nums text-slate-200">{value}</span>
    </label>
  )
}

const isUsableUrl = (u: string) => /^(https?:\/\/|data:image\/|\/)/i.test(u)

/** Paste an image URL and see the thumbnail right away. */
function ImageUrlField({ player, onChange }: { player: Player; onChange: (url: string | undefined) => void }) {
  const [text, setText] = useState(player.imageUrl ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const url = text.trim()

  // Push the pasted URL up once typing settles.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = url || undefined
      if (next !== player.imageUrl) onChange(next)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  useEffect(() => {
    setStatus(url && isUsableUrl(url) ? 'loading' : 'idle')
  }, [url])

  const usable = url && isUsableUrl(url)
  const shown = usable ? url : playerImage(player.id)
  return (
    <div className="flex gap-3 md:col-span-2">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-panel-2">
        {status !== 'error' && <img key={shown} src={shown} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover object-top" onLoad={() => usable && setStatus('ok')} onError={() => usable && setStatus('error')} />}
        {(status === 'error' || (!usable && !player.imageUrl)) && status !== 'ok' && (
          <div className="absolute inset-0 grid place-items-center p-1 text-center text-[11px] text-slate-500">{status === 'error' ? 'Could not load' : 'No image'}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Player image</div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an image URL (https://…)"
            className="min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          {text && <button onClick={() => setText('')} className="rounded-md border border-line px-2 text-xs text-slate-400 hover:text-white">Clear</button>}
        </div>
        <div className="mt-1.5 text-xs">
          {url && !usable && <span className="text-amber-300">The link needs to start with http:// or https://.</span>}
          {usable && status === 'loading' && <span className="text-slate-400">Loading preview…</span>}
          {usable && status === 'ok' && <span className="text-emerald-300">Looks good.</span>}
          {usable && status === 'error' && <span className="text-red-300">That link didn't load as an image. Try right-click the image, “Copy image address”, and paste that. Some sites block other pages from using their images.</span>}
          {!url && <span className="text-slate-500">Leave empty to use the default portrait or initials.</span>}
        </div>
      </div>
    </div>
  )
}

/** Paste a logo URL and see how it will look as the team's crest. Leave it empty to keep the built-in emblem. */
function LogoUrlField({ team, onChange }: { team: Team; onChange: (url: string | undefined) => void }) {
  const [text, setText] = useState(team.logoUrl ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const url = text.trim()
  const usable = !!url && isUsableUrl(url)

  useEffect(() => {
    const t = setTimeout(() => {
      const next = url || undefined
      if (next !== team.logoUrl) onChange(next)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  useEffect(() => {
    setStatus(usable ? 'loading' : 'idle')
  }, [url, usable])

  return (
    <div className="flex items-center gap-4 md:col-span-6">
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-center"><TeamCrest team={{ ...team, logoUrl: usable ? url : undefined }} size={72} /><div className="mt-1 text-[11px] text-slate-500">{usable && status === 'ok' ? 'Your logo' : 'Preview'}</div></div>
        {usable && <img src={url} alt="" className="hidden" referrerPolicy="no-referrer" onLoad={() => setStatus('ok')} onError={() => setStatus('error')} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs text-slate-400">Team logo image URL <span className="text-slate-600">(optional)</span></div>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an image URL (https://…). Empty keeps the default emblem." className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          {text && <button onClick={() => setText('')} className="rounded-lg border border-line px-3 text-xs text-slate-400 hover:text-white">Use default</button>}
        </div>
        <div className="mt-1.5 text-xs">
          {url && !usable && <span className="text-amber-300">The link needs to start with http:// or https://.</span>}
          {usable && status === 'loading' && <span className="text-slate-400">Loading preview…</span>}
          {usable && status === 'ok' && <span className="text-emerald-300">Looks good.</span>}
          {usable && status === 'error' && <span className="text-red-300">That link didn't load as an image, so the default emblem is shown. Try “Copy image address” on the image and paste that.</span>}
          {!url && <span className="text-slate-500">Square images with a transparent background look best.</span>}
        </div>
      </div>
    </div>
  )
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

function PlayerEditor({
  player, team, index, onChange, onRemove,
}: {
  player: Player; team: Team; index: number
  onChange: (p: Player) => void; onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const ovr = overall(player)
  const setBat = (k: keyof Player['batting'], v: number) => onChange({ ...player, batting: { ...player.batting, [k]: v } })
  const setBowl = (patch: Partial<NonNullable<Player['bowling']>>) =>
    player.bowling && onChange({ ...player, bowling: { ...player.bowling, ...patch } })

  const regen = (role: Role, level: number) => {
    const g = generatePlayer(player.id, player.name, role, level, player.bowling?.type)
    onChange({ ...g, traits: player.traits, hand: player.hand, imageUrl: player.imageUrl })
  }

  return (
    <div className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <span className="w-6 text-center font-display text-xl text-slate-600">{index + 1}</span>
        <PlayerAvatar player={player} team={team} size={34} />
        <input
          value={player.name}
          onChange={(e) => onChange({ ...player, name: e.target.value })}
          placeholder="Player name"
          className="min-w-32 flex-1 rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
        <select value={player.role} onChange={(e) => regen(e.target.value as Role, ovr)} className="rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-400" title="Drag to auto-fill all attributes from one rating">
          Level
          <input type="range" min={20} max={95} value={ovr} onChange={(e) => regen(player.role, +e.target.value)} className="w-28" />
        </label>
        <RatingBadge value={ovr} size="sm" />
        <button onClick={() => setOpen((o) => !o)} className="px-1 text-xs text-slate-400 hover:text-white">{open ? 'Hide' : 'Edit details'}</button>
        <button onClick={onRemove} className="px-1 text-slate-500 hover:text-red-400" aria-label="Remove">✕</button>
      </div>
      {open && (
        <div className="grid gap-x-8 gap-y-3 border-t border-line p-3 md:grid-cols-2">
          <ImageUrlField player={player} onChange={(imageUrl) => onChange({ ...player, imageUrl })} />
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Batting</div>
            <Slider label="Technique" value={player.batting.technique} onChange={(v) => setBat('technique', v)} />
            <Slider label="Power" value={player.batting.power} onChange={(v) => setBat('power', v)} />
            <Slider label="Temperament" value={player.batting.temperament} onChange={(v) => setBat('temperament', v)} />
            <Slider label="Running" value={player.batting.running} onChange={(v) => setBat('running', v)} />
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-400">
              <span className="w-24">Batting hand</span>
              <select value={player.hand} onChange={(e) => onChange({ ...player, hand: e.target.value as 'R' | 'L' })} className="rounded border border-line bg-panel-2 px-2 py-1">
                <option value="R">Right</option><option value="L">Left</option>
              </select>
            </label>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bowling & fielding</div>
            {player.bowling ? (
              <>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-24">Type</span>
                  <select value={player.bowling.type} onChange={(e) => setBowl({ type: e.target.value as BowlType })} className="rounded border border-line bg-panel-2 px-2 py-1">
                    {BOWL_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <Slider label="Accuracy" value={player.bowling.accuracy} onChange={(v) => setBowl({ accuracy: v })} />
                <Slider label="Variation" value={player.bowling.variation} onChange={(v) => setBowl({ variation: v })} />
                <Slider label="Stamina" value={player.bowling.stamina} onChange={(v) => setBowl({ stamina: v })} />
              </>
            ) : (
              <div className="text-xs text-slate-500">Batsman and keeper roles don't bowl. Switch the role to All-rounder or Bowler to add bowling.</div>
            )}
            <Slider label="Fielding" value={player.fielding} onChange={(v) => onChange({ ...player, fielding: v })} />
          </div>
          <div className="md:col-span-2">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Traits</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TRAITS.map((t: Trait) => (
                <button
                  key={t}
                  onClick={() => onChange({ ...player, traits: toggle(player.traits, t) })}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${player.traits.includes(t) ? 'border-indigo-400 bg-indigo-400/20 text-white' : 'border-line text-slate-500 hover:text-slate-200'}`}
                >
                  {t.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TeamEditor({ id }: { id?: string }) {
  const teams = useTeams()
  const save = useStore((s) => s.saveTeam)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const existing = id ? teams.find((t) => t.id === id) : undefined
  const [team, setTeam] = useState<Team>(() => existing ?? emptyTeamDraft())
  // List order: best rated first, frozen at the ratings you opened the page with so rows
  // don't jump while you drag a slider. Players you add later go to the end.
  const [rankOrder] = useState(() => [...team.players].sort((a, b) => overall(b) - overall(a)).map((p) => p.id))
  const listed = useMemo(() => {
    const rank = new Map(rankOrder.map((id, i) => [id, i]))
    return [...team.players].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
  }, [team.players, rankOrder])

  const { errors, warnings } = useMemo(() => {
    const errors: string[] = []
    if (!team.name.trim()) errors.push('Give your team a name.')
    if (team.short.trim().length < 2) errors.push('Pick a short code (2-4 letters).')
    if (teams.some((t) => t.id !== team.id && t.short.toLowerCase() === team.short.trim().toLowerCase())) errors.push('That short code is already used by another team.')
    if (team.players.some((p) => !p.name.trim())) errors.push('Every player needs a name.')
    if (team.players.length < 11) errors.push('You need at least 11 players.')
    // XI problems don't block saving here; they're fixed on the squad page.
    const warnings = validateSquad(team.players, team.captainId).errors
    return { errors, warnings }
  }, [team, teams])

  const update = (id: string, p: Player) => setTeam((t) => ({ ...t, players: t.players.map((x) => (x.id === id ? p : x)) }))
  const patch = (p: Partial<Team>) => setTeam((t) => ({ ...t, ...p }))

  const addPlayer = () =>
    setTeam((t) => {
      const name = `Player ${t.players.length + 1}`
      return { ...t, players: [...t.players, generatePlayer(newPlayerId(t.id, name), name, 'AR', 55)] }
    })

  const onSave = () => {
    const captainId = team.players.some((p) => p.id === team.captainId) ? team.captainId : team.players[0].id
    save({ ...team, name: team.name.trim(), short: team.short.trim().toUpperCase(), captainId })
    // "create your own team" from the new-session page sends you back there with the team selected
    const next = params.get('next')
    if (!existing && next && next.startsWith('/')) navigate(`${next}?team=${encodeURIComponent(team.id)}`)
    else if (!keeperIn(team.players.slice(0, 11), team.keeperId)) navigate(`${paths.squad(team.id)}?pick=1`) // no keeper yet: choose one on the squad page
    else navigate(paths.team(team.id))
  }

  const field = 'rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-indigo-400'

  return (
    <div>
      <Link to={existing ? paths.team(team.id) : paths.teams} className="mb-4 inline-block text-sm text-slate-400 hover:text-white">← Back</Link>
      <h1 className="mb-6 font-display text-5xl tracking-wide">{existing ? 'Edit team' : 'Create a team'}</h1>
      {existing && !existing.isCustom && (
        <p className="-mt-4 mb-6 text-sm text-slate-400">Changes are saved in this browser on top of the default squad. You can reset to the default any time from the team page.</p>
      )}

      <div className="grid gap-3 rounded-2xl border border-line bg-panel p-5 md:grid-cols-6">
        <label className="md:col-span-3"><div className="mb-1 text-xs text-slate-400">Team name</div><input className={`${field} w-full`} value={team.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Thunder Erasers" /></label>
        <label><div className="mb-1 text-xs text-slate-400">Short code</div><input className={`${field} w-full uppercase`} maxLength={4} value={team.short} onChange={(e) => patch({ short: e.target.value })} placeholder="TNE" /></label>
        <label className="md:col-span-2"><div className="mb-1 text-xs text-slate-400">Franchise / group</div><input className={`${field} w-full`} value={team.series} onChange={(e) => patch({ series: e.target.value })} placeholder="My Friends" /></label>
        <label className="md:col-span-2"><div className="mb-1 text-xs text-slate-400">Home ground</div><input className={`${field} w-full`} value={team.home} onChange={(e) => patch({ home: e.target.value })} /></label>
        <label className="flex items-center gap-3"><span className="text-xs text-slate-400">Primary</span><input type="color" value={team.colors.primary} onChange={(e) => patch({ colors: { ...team.colors, primary: e.target.value } })} className="h-9 w-14 cursor-pointer rounded border border-line bg-transparent" /></label>
        <label className="flex items-center gap-3"><span className="text-xs text-slate-400">Secondary</span><input type="color" value={team.colors.secondary} onChange={(e) => patch({ colors: { ...team.colors, secondary: e.target.value } })} className="h-9 w-14 cursor-pointer rounded border border-line bg-transparent" /></label>
        <LogoUrlField team={team} onChange={(logoUrl) => patch({ logoUrl })} />
      </div>

      {team.isCustom && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-4">
        <span className="text-xs text-slate-400">Logo</span>
        {GENERIC_EMBLEMS.map((e) => (
          <button key={e} onClick={() => patch({ emblem: e })} className={`rounded-xl border p-1.5 transition ${team.emblem === e ? 'border-indigo-400 bg-indigo-400/15' : 'border-line hover:border-slate-500'}`} aria-label={`Emblem ${e}`}>
            <TeamCrest team={{ ...team, id: `custom-${e}`, emblem: e }} size={44} />
          </button>
        ))}
      </div>}

      <div className="mt-8 mb-3 flex items-end justify-between">
        <h2 className="font-display text-3xl tracking-wide">Players <span className="text-sm font-sans text-slate-500">{team.players.length}/{MAX_PLAYERS}. Sorted by rating. Choose who plays and the batting order on the squad page.</span></h2>
        <button disabled={team.players.length >= MAX_PLAYERS} onClick={addPlayer} className="rounded-full border border-line px-3 py-1.5 text-sm text-slate-300 hover:border-indigo-400 disabled:opacity-40">+ Add player</button>
      </div>
      <div className="space-y-2">
        {listed.map((p, i) => (
          <PlayerEditor
            key={p.id} player={p} team={team} index={i}
            onChange={(np) => update(p.id, np)}
            onRemove={() => setTeam((t) => {
              const players = t.players.filter((x) => x.id !== p.id)
              return { ...t, players, captainId: players.some((x) => x.id === t.captainId) ? t.captainId : (players[0]?.id ?? '') }
            })}
          />
        ))}
      </div>

      <div className="sticky bottom-0 max-md:bottom-[calc(var(--sab)+66px)] mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 p-4 backdrop-blur">
        <ul className="space-y-0.5 text-sm">
          {errors.map((e) => <li key={e} className="text-red-300">• {e}</li>)}
          {warnings.map((e) => <li key={e} className="text-amber-300">• {e} <span className="text-slate-400">(fix on the </span><Link to={paths.squad(team.id)} className="text-indigo-300 hover:underline">squad page</Link><span className="text-slate-400"> after saving)</span></li>)}
          {errors.length === 0 && warnings.length === 0 && <li className="text-emerald-300">Looks good. Ready to save.</li>}
        </ul>
        <button disabled={errors.length > 0} onClick={onSave} className="rounded-full bg-indigo-500 px-6 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">
          Save team
        </button>
      </div>
    </div>
  )
}
