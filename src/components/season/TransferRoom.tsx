import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { PlayerAvatar, TeamCrest, RatingBadge } from '../ui'
import { PresenterAvatar } from '../PresenterAvatar'
import { PRESENTERS, type Presenter } from '../../data/presenters'
import { cancelSpeech, speak } from '../../audio/voice'
import { callName } from '../match/format'
import type { Team } from '../../types'
import { ROOM, roomScript, type RoomLine, type RoomWho } from './transferScript'
import { transferFacts, type TransferFacts } from './transferFacts'
import type { TransferRow } from './TransferScreens'

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) / 4294967296 }
const presenter = (key: string, not: string[] = []): Presenter => {
  const list = PRESENTERS.filter((p) => !not.includes(p.id))
  return list[Math.floor(hash(key) * list.length) % list.length]
}
const TIER_INDEX: Record<string, number> = { Legendary: 5, Elite: 4, Star: 3, Solid: 2, Fringe: 1, Tailender: 0 }
const SPEAKER_VOICE: Record<RoomWho, 'host' | 'exp1' | 'exp2'> = { host: 'host', seller: 'exp1', buyer: 'exp1', player: 'exp2' }

/** The shirt the new player holds up, in his new club's colours. */
function Shirt({ team, name, number }: { team: Team; name: string; number: number }) {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
      <path d="M38 8 L16 22 L4 50 L22 58 L30 44 L30 112 L90 112 L90 44 L98 58 L116 50 L104 22 L82 8 Q60 24 38 8 Z" fill={team.colors.primary} stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M4 50 L22 58 L30 44 L16 22 Z M116 50 L98 58 L90 44 L104 22 Z" fill={team.colors.secondary} opacity="0.9" />
      <path d="M38 8 Q60 24 82 8 L78 6 Q60 18 42 6 Z" fill={team.colors.secondary} />
      <rect x="30" y="62" width="60" height="7" fill={team.colors.secondary} opacity="0.55" />
      <text x="60" y="52" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" style={{ letterSpacing: 1 }}>{name.toUpperCase().slice(0, 10)}</text>
      <text x="60" y="96" textAnchor="middle" fontSize="34" fontWeight="900" fill="#fff" style={{ fontFamily: 'inherit' }}>{number}</text>
    </svg>
  )
}

/** A person at the table: a presenter playing a club official, with a name strap in the club's colours. */
function Official({ p, team, role, side, speaking, delay }: { p: Presenter; team: Team; role: string; side: 'left' | 'right'; speaking: boolean; delay: number }) {
  return (
    <motion.div
      className="absolute bottom-[19%] flex w-[27%] flex-col items-center"
      style={{ [side]: '3%' } as React.CSSProperties}
      initial={{ opacity: 0, x: side === 'left' ? -60 : 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.9, ease: 'easeOut' }}
    >
      <div className="relative rounded-full transition" style={{ boxShadow: speaking ? `0 0 0 3px ${team.colors.primary}, 0 0 24px ${team.colors.primary}` : '0 0 0 2px rgba(255,255,255,0.15)' }}>
        <PresenterAvatar presenter={p} size={78} />
        <div className="absolute -bottom-1 -right-1 rounded-full bg-[#0b0e15] p-0.5"><TeamCrest team={team} size={24} /></div>
      </div>
      <div className="mt-1 max-w-full truncate rounded-sm px-2 py-0.5 text-center text-[9px] font-extrabold uppercase leading-tight tracking-wide text-white" style={{ background: team.colors.primary, boxShadow: `0 0 0 1px ${team.colors.secondary}` }}>{role}</div>
    </motion.div>
  )
}

/** The room itself, drawn in code: dark panelled wall, a window over the city, ceiling lights, a banner in the two clubs' colours, a long wooden table. */
function RoomArt({ from, to }: { from: Team | null; to: Team | null }) {
  const a = from?.colors.primary ?? '#475569', b = to?.colors.primary ?? '#475569'
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 520" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="tr-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2340" /><stop offset="1" stopColor="#0c1020" /></linearGradient>
        <linearGradient id="tr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e3a8a" /><stop offset="1" stopColor="#312e81" /></linearGradient>
        <linearGradient id="tr-banner" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={a} /><stop offset="0.5" stopColor="#101524" /><stop offset="1" stopColor={b} /></linearGradient>
        <radialGradient id="tr-light" cx="50%" cy="0%" r="80%"><stop offset="0" stopColor="#fff7d6" stopOpacity="0.55" /><stop offset="1" stopColor="#fff7d6" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="360" height="520" fill="url(#tr-wall)" />
      {/* wood panelling on the lower wall */}
      <rect y="250" width="360" height="270" fill="#2a1d18" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={i * 42 + 6} y="258" width="34" height="200" rx="3" fill="#35251d" stroke="#1b110d" strokeWidth="1" />)}
      <rect y="246" width="360" height="6" fill="#4a3427" />
      {/* the window over the city */}
      <g>
        <rect x="14" y="58" width="92" height="150" fill="url(#tr-sky)" stroke="#3b2f2a" strokeWidth="5" />
        {[[22, 150, 16, 58], [42, 130, 14, 78], [60, 160, 18, 48], [82, 140, 16, 68]].map(([x, y, w, h], i) => <g key={i}><rect x={x} y={y} width={w} height={h} fill="#0b1026" />{[0, 1, 2, 3].map((r) => <rect key={r} x={x + 3} y={y + 6 + r * 12} width="3" height="4" fill="#fde68a" opacity={0.4 + ((i + r) % 3) * 0.2} />)}</g>)}
        <line x1="60" y1="58" x2="60" y2="208" stroke="#3b2f2a" strokeWidth="3" /><line x1="14" y1="130" x2="106" y2="130" stroke="#3b2f2a" strokeWidth="3" />
      </g>
      {/* the banner behind the table, in the two clubs' colours */}
      <rect x="118" y="52" width="150" height="112" rx="4" fill="url(#tr-banner)" stroke="#e5e7eb" strokeOpacity="0.5" strokeWidth="2" />
      <text x="193" y="150" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" opacity="0.85" style={{ letterSpacing: 4 }}>TRANSFER ROOM</text>
      {/* a screen on the wall */}
      <rect x="280" y="76" width="64" height="40" rx="3" fill="#06080f" stroke="#334155" strokeWidth="2" />
      <rect x="285" y="82" width="54" height="5" fill="#ef4444" /><rect x="285" y="92" width="40" height="3" fill="#94a3b8" /><rect x="285" y="99" width="46" height="3" fill="#94a3b8" /><rect x="285" y="106" width="30" height="3" fill="#94a3b8" />
      {/* ceiling lights */}
      {[70, 193, 316].map((x) => <g key={x}><rect x={x - 14} y="0" width="28" height="6" fill="#d6d3d1" /><polygon points={`${x - 12},6 ${x + 12},6 ${x + 70},300 ${x - 70},300`} fill="url(#tr-light)" /></g>)}
    </svg>
  )
}

/** The facts of a move as a clean card: the player, the two clubs and what changed hands. */
export function TransferCard({ facts, club }: { facts: TransferFacts; club: Team }) {
  const side = (s: TransferFacts['from'] | TransferFacts['to'], title: string) => (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{title}</div>
      {s.team ? <TeamCrest team={s.team} size={42} /> : <div className="grid h-[42px] w-[42px] place-items-center rounded-full border border-dashed border-slate-500 text-lg text-slate-500">?</div>}
      <div className="w-full truncate text-xs font-bold text-white">{s.name}</div>
      <div className="text-[10px] text-slate-400">{s.note}</div>
    </div>
  )
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-[#0d1220]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] backdrop-blur" style={{ borderColor: `${club.colors.primary}99` }}>
      <div className="flex items-center gap-2">
        <span className="rounded px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-black" style={{ background: facts.kind === 'release' ? '#fb7185' : facts.kind === 'buy' ? '#38bdf8' : '#4ade80' }}>{facts.label}</span>
        {facts.yours && <span className="rounded border border-amber-300/60 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-200">{facts.yours === 'bought' ? 'You bought him' : facts.yours === 'sold' ? 'You sold him' : facts.yours === 'signed' ? 'You signed him' : 'You released him'}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl leading-none tracking-wide text-white">{facts.player.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-slate-300">{facts.player.role} · {facts.player.detail}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: facts.player.tierColor }}>{facts.player.tier}</div>
        </div>
        <RatingBadge value={facts.player.rating} size="md" />
      </div>
      <div className="mt-2.5 flex items-center gap-1 rounded-xl bg-black/30 px-2 py-2">
        {side(facts.from, 'From')}
        <div className="shrink-0 px-1 text-2xl text-amber-300" aria-label="to">➜</div>
        {side(facts.to, 'To')}
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {facts.rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-400">{k}</dt><dd className="truncate text-right font-bold text-white">{v}</dd></div>)}
      </dl>
    </div>
  )
}

/** One move, acted out in a conference room: the officials of both clubs and the player sit at a long table, the contract is signed, cameras flash, and he holds up the shirt. */
export function TransferRoom({ row, mine, onDone }: { row: TransferRow; mine?: string | null; onDone: () => void }) {
  const { t, player, from, to, club } = row
  const facts = useMemo(() => transferFacts(row, mine), [row, mine])
  const mode = facts.kind
  const seed = Math.floor(hash(t.id) * 100000)
  const host = presenter(t.id + 'h')
  const sellerP = presenter((from?.id ?? club.id) + 'x', [host.id])
  const buyerP = presenter((to?.id ?? club.id) + 'y', [host.id, sellerP.id])
  const tier = TIER_INDEX[facts.player.tier] ?? 2
  const lines = useMemo(() => roomScript({ mode, player: callName(player), to: to?.name ?? club.name, from: from?.name ?? club.name, fee: t.fee, tier, seed, rating: facts.player.rating }), [mode, player, to, from, club, t.fee, tier, seed, facts.player.rating])
  const [now, setNow] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    const id = window.setInterval(() => setNow((performance.now() - t0) / 1000), 100)
    return () => window.clearInterval(id)
  }, [])
  const line: RoomLine | undefined = lines.find((l) => now >= l.at && now < l.end)
  // speak each line once, in its own voice (the game asks first; with voices off this does nothing)
  useEffect(() => {
    const timers = lines.map((l) => window.setTimeout(() => { void speak(l.text, SPEAKER_VOICE[l.who]) }, l.at * 1000))
    return () => { timers.forEach(clearTimeout); cancelSpeech() }
  }, [lines])
  useEffect(() => { const id = window.setTimeout(onDone, (ROOM.end + 0.8) * 1000); return () => clearTimeout(id) }, [onDone])

  const buyer = to ?? club
  const seller = from ?? club
  const speakerName = line ? (line.who === 'host' ? host.name : line.who === 'seller' ? sellerP.name : line.who === 'buyer' ? buyerP.name : callName(player)) : ''
  const flash = now >= ROOM.flash && now < ROOM.flash + 1.2
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-[300px] flex-1 overflow-hidden">
        <RoomArt from={from} to={to} />
        {/* the clubs' crests on the banner */}
        <div className="absolute left-1/2 top-[8.5%] flex -translate-x-1/2 items-center gap-5">
          {from ? <TeamCrest team={from} size={34} /> : <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-dashed border-slate-400 text-slate-400">?</span>}
          <span className="text-lg text-white/80" aria-hidden>➜</span>
          {to ? <TeamCrest team={to} size={34} /> : <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-dashed border-slate-400 text-slate-400">?</span>}
        </div>

        {/* what is being said */}
        <div className="absolute inset-x-3 top-2 z-20 min-h-[44px]">
          {line && (
            <motion.div key={line.text} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-xl bg-black/70 px-2.5 py-2 backdrop-blur">
              {line.who === 'host' ? <PresenterAvatar presenter={host} size={28} /> : <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />}
              <p className="text-xs leading-snug text-white"><b className="mr-1 text-amber-300">{speakerName}</b>{line.text}</p>
            </motion.div>
          )}
        </div>

        {mode !== 'sign' && <Official p={sellerP} team={seller} role={mode === 'release' ? 'Club director' : 'Selling club'} side="left" speaking={line?.who === 'seller'} delay={ROOM.enter} />}
        {mode === 'sign' && <Official p={sellerP} team={buyer} role="Scout" side="left" speaking={false} delay={ROOM.enter} />}
        {mode !== 'release' && <Official p={buyerP} team={buyer} role="Buying club" side="right" speaking={line?.who === 'buyer'} delay={ROOM.enter + 0.3} />}
        {mode === 'release' && <Official p={buyerP} team={seller} role="Manager" side="right" speaking={false} delay={ROOM.enter + 0.3} />}

        {/* the player walks in and sits in the middle */}
        <motion.div className="absolute bottom-[21%] left-1/2 z-10 -translate-x-1/2" initial={{ opacity: 0, y: 40, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: ROOM.player, duration: 1.0, ease: 'easeOut' }}>
          <div className="rounded-full transition" style={{ boxShadow: line?.who === 'player' ? `0 0 0 3px #fbbf24, 0 0 28px #fbbf24` : '0 0 0 2px rgba(255,255,255,0.25)' }}>
            <PlayerAvatar player={player} team={buyer} size={92} />
          </div>
        </motion.div>

        {/* the table */}
        <div className="absolute inset-x-0 bottom-0 z-[15] h-[22%]" style={{ clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0 100%)', background: 'linear-gradient(#8a5a36, #5a3820 40%, #3b2314)' }}>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[#d9a066]/70" />
        </div>
        {/* the contract */}
        <motion.div className="absolute bottom-[3.5%] left-1/2 z-[16] h-[14%] w-[34%] -translate-x-1/2 rounded-sm bg-[#f4f1e8] p-1.5 shadow-lg" style={{ rotate: -3 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ROOM.paper, duration: 0.7 }}>
          <div className="text-[7px] font-extrabold uppercase tracking-widest text-slate-700">{mode === 'release' ? 'Release notice' : 'Player contract'}</div>
          <div className="mt-0.5 h-px bg-slate-400" /><div className="mt-1 h-px bg-slate-300" /><div className="mt-1 h-px bg-slate-300" />
          <svg viewBox="0 0 100 24" className="absolute bottom-0.5 left-2 right-2" aria-hidden>
            <motion.path d="M4 18 Q10 2 16 16 T30 14 Q38 4 44 16 T62 12 L90 14" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: ROOM.sign, duration: 2.0, ease: 'easeInOut' }} />
          </svg>
        </motion.div>
        {/* the handshake, or the stamp */}
        {mode !== 'release' && <motion.div className="absolute left-1/2 top-[40%] z-[18] -translate-x-1/2 text-5xl" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ROOM.sign + 2.3, type: 'spring', stiffness: 220, damping: 12 }}>🤝</motion.div>}
        {mode === 'release' && <motion.div className="absolute left-1/2 top-[42%] z-[18] -translate-x-1/2 rounded border-4 border-rose-500 px-3 py-1 font-display text-3xl tracking-widest text-rose-500" style={{ rotate: -10 }} initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 0.95, scale: 1 }} transition={{ delay: ROOM.sign + 2.3, duration: 0.25 }}>RELEASED</motion.div>}
        {/* the shirt he holds up */}
        {mode !== 'release' && (
          <motion.div className="absolute bottom-[17%] left-1/2 z-[17] h-[20%] w-[22%] -translate-x-1/2" initial={{ opacity: 0, y: 60, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: ROOM.shirt, duration: 0.8, type: 'spring', damping: 14 }}>
            <Shirt team={buyer} name={callName(player)} number={(Math.floor(hash(player.id) * 98) + 1)} />
          </motion.div>
        )}
        {/* cameras flash */}
        {flash && <motion.div className="pointer-events-none absolute inset-0 z-30 bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: [0.85, 0, 0.7, 0, 0.6, 0] }} transition={{ duration: 1.1 }} />}
        <div className="pointer-events-none absolute inset-x-0 bottom-1 z-[19] flex justify-between px-3 text-lg opacity-70" aria-hidden><span>📸</span><span>🎥</span><span>📸</span></div>
      </div>
      <div className="shrink-0 px-3 pb-3 pt-2"><TransferCard facts={facts} club={buyer} /></div>
    </div>
  )
}
