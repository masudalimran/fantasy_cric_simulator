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
  { id: 'paradis-shield', name: 'Paradis Shield', originTeamId: 'aot', format: 'odi', kind: 'knockout', blurb: 'Behind the walls, a shield for whoever holds the line.' },
  { id: 'equivalent-exchange-cup', name: 'Equivalent Exchange Cup', originTeamId: 'fma', format: 'odi', kind: 'league', blurb: 'To gain something, something of equal value must be lost. Mostly wickets.' },
  { id: 'thedas-conclave-cup', name: 'Thedas Conclave Cup', originTeamId: 'dragonage', format: 'odi', kind: 'cup', blurb: 'Called by the Divine, a ceasefire for one tournament.' },
  { id: 'brotherhood-series', name: 'Brotherhood Series', originTeamId: 'assassinscreed', format: 'odi', kind: 'cup', blurb: 'Nothing is true, everything is permitted. Even a rematch.' },
  { id: 'stand-arrow-cup', name: 'Stand Arrow Cup', originTeamId: 'jojo', format: 'odi', kind: 'cup', blurb: 'Pierced by the Arrow, you get a Stand. Pierced by the final, you get a trophy. Yare yare daze.' },
  { id: 'duelist-kingdom-championship', name: 'Duelist Kingdom Championship', originTeamId: 'yugioh', format: 'odi', kind: 'cup', blurb: 'It is time to d-d-d-duel. Every over is a card face down and every wicket is a trap card.' },
  { id: 'holy-war-cup', name: 'Holy War Cup', originTeamId: 'sds', format: 'odi', kind: 'cup', blurb: 'Knights, demons and a talking pig fight over a trophy instead of a kingdom.' },
  { id: 'shikon-jewel-shield', name: 'Shikon Jewel Shield', originTeamId: 'inuyasha', format: 'odi', kind: 'knockout', blurb: 'Hunted across the Sengoku era, shattered and scattered. Win the shield, hold the jewel.' },
  { id: 'demon-slayer-final-selection', name: 'Final Selection Cup', originTeamId: 'demonslayer', format: 'odi', kind: 'knockout', blurb: 'Survive seven nights on Fujikasane. Qualify for the next round.' },
]
