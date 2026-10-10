import type { TournamentDef } from '../types'

/**
 * Every tournament "originated" with one team, so its name echoes that team's world.
 * The scheduler (later) fills the calendar from this catalogue plus bilateral series.
 */
export const TOURNAMENTS: TournamentDef[] = [
  // ---- T20 ----
  { id: 'seireitei-premier-league', name: 'Seireitei Premier League', originTeamId: 'bleach', format: 't20', kind: 'league', blurb: 'The Gotei 13 settled their rivalries on the pitch, and it never stopped.' },
  { id: 'hokage-cup', name: 'Hokage Cup', originTeamId: 'naruto', format: 't20', kind: 'knockout', blurb: 'Win the cup, earn the right to be called the strongest in the land.' },
  { id: 'tenkaichi-budokai', name: 'Tenkaichi Budokai', originTeamId: 'dragonball', format: 't20', kind: 'knockout', blurb: 'The world martial arts tournament, now with more bats.' },
  { id: 'grand-line-super-league', name: 'Grand Line Super League', originTeamId: 'onepiece', format: 't20', kind: 'league', blurb: 'Pirates sail from island to island, a fixture at every port.' },
  { id: 'culling-game-cup', name: 'Culling Game Cup', originTeamId: 'jjk', format: 't20', kind: 'cup', blurb: 'Score points, survive the round, avoid the barrier.' },
  { id: 'aegis-championship', name: 'Aegis Championship', originTeamId: 'dota', format: 't20', kind: 'cup', blurb: 'The biggest prize in the Ancient. Whoever holds the Aegis gets a second life.' },
  { id: 'wraeclast-challenge-league', name: 'Wraeclast Challenge League', originTeamId: 'poe', format: 't20', kind: 'league', blurb: 'A new league every season, a fresh grind for everyone.' },
  { id: 'ua-sports-festival', name: 'U.A. Sports Festival Cup', originTeamId: 'mha', format: 't20', kind: 'cup', blurb: 'Pro scouts watching from the stands. Plus Ultra.' },
  // ---- ODI ----
  { id: 'kaer-morhen-trophy', name: 'Kaer Morhen Trophy', originTeamId: 'witcher', format: 'odi', kind: 'cup', blurb: 'Contested at the old keep every winter, for the right to say you survived the Trial.' },
  { id: 'crystal-chronicles-cup', name: 'Crystal Chronicles Cup', originTeamId: 'finalfantasy', format: 'odi', kind: 'league', blurb: 'Each team guards a crystal. Lose enough games and it shatters.' },
  { id: 'tamriel-championship', name: 'Tamriel Championship', originTeamId: 'elderscrolls', format: 'odi', kind: 'league', blurb: 'Nine provinces, one champion, a lot of arguing about the Thalmor.' },
  { id: 'triforce-trophy', name: 'Triforce Trophy', originTeamId: 'zelda', format: 'odi', kind: 'cup', blurb: 'Courage, Wisdom, Power. Pick two and still fall short.' },
  { id: 'citadel-council-cup', name: 'Citadel Council Cup', originTeamId: 'masseffect', format: 'odi', kind: 'knockout', blurb: 'Arbitrated by the Council. The Council will not be doing anything about the umpiring.' },
  { id: 'paradis-shield', name: 'Paradis Shield', originTeamId: 'aot', format: 'odi', kind: 'knockout', blurb: 'Behind the walls, a shield for whoever holds the line.' },
  { id: 'equivalent-exchange-cup', name: 'Equivalent Exchange Cup', originTeamId: 'fma', format: 'odi', kind: 'league', blurb: 'To gain something, something of equal value must be lost. Mostly wickets.' },
  { id: 'thedas-conclave-cup', name: 'Thedas Conclave Cup', originTeamId: 'dragonage', format: 'odi', kind: 'cup', blurb: 'Called by the Divine, a ceasefire for one tournament.' },
  { id: 'brotherhood-series', name: 'Brotherhood Series', originTeamId: 'assassinscreed', format: 'odi', kind: 'cup', blurb: 'Nothing is true, everything is permitted. Even a rematch.' },
  { id: 'demon-slayer-final-selection', name: 'Final Selection Cup', originTeamId: 'demonslayer', format: 'odi', kind: 'knockout', blurb: 'Survive seven nights on Fujikasane. Qualify for the next round.' },
  { id: 'spartan-ii-invitational', name: 'Spartan Invitational', originTeamId: 'halo', format: 'odi', kind: 'cup', blurb: 'Held at Reach, before the glassing.' },
  { id: 'overwatch-world-cup', name: 'Overwatch World Cup', originTeamId: 'overwatch', format: 'odi', kind: 'cup', blurb: 'Heroes never die. Neither do the rematches.' },
]
