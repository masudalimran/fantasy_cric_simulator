/** Every page has its own URL, so links, refresh and the back button all work. */
export const paths = {
  home: '/',
  teams: '/teams',
  newTeam: '/teams/new',
  team: (id: string) => `/teams/${encodeURIComponent(id)}`,
  squad: (id: string) => `/teams/${encodeURIComponent(id)}/squad`,
  editTeam: (id: string) => `/teams/${encodeURIComponent(id)}/edit`,
  crests: '/crests',
  play: '/play',
  review: '/career/review',
  sessionSquad: '/career/squad',
  /** The calendar of the career you have open. */
  session: (ym?: string) => (ym ? `/career/calendar/${ym}` : '/career/calendar'),
  /** The career landing page: your saved careers, and a way to start a new one. */
  sessions: '/career',
  newSession: '/career/new',
  competitions: '/career/tournaments',
  /** Every match played so far in the career year you're looking at. */
  results: '/career/results',
  /** A team as it is in the career you have open: its current squad and this season's results. */
  careerTeam: (id: string) => `/career/team/${encodeURIComponent(id)}`,
  stats: '/career/stats',
  backup: '/backup',
  market: '/career/market',
  competition: (id: string) => `/career/tournaments/${encodeURIComponent(id)}`,
  match: (a: string, b: string, format: string, seed: number) => `/match/${format}/${encodeURIComponent(a)}-vs-${encodeURIComponent(b)}/${seed}`,
} as const
