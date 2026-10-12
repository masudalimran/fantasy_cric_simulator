/**
 * The pool of coaches. They come from video games that have no team in the game, so nobody here is already a player.
 * A coach has no portrait: he is a name, a game and a way of coaching. His `skill` (1 to 99) sets how fast his players
 * improve, and a coach is a little better at his `specialty`.
 */
export type CoachFocus = 'batting' | 'bowling' | 'fielding'

export interface Coach {
  id: string
  name: string
  game: string
  specialty: CoachFocus
  skill: number
  /** One line about how he coaches. */
  style: string
}

const c = (name: string, game: string, specialty: CoachFocus, skill: number, style: string): Coach => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, game, specialty, skill, style })

export const COACHES: Coach[] = [
  c('Kratos', 'God of War', 'fielding', 88, 'Boy. Again. Drills the same catch until it is perfect.'),
  c('Big Boss', 'Metal Gear Solid', 'fielding', 90, 'Plans every move and every throw like a covert operation.'),
  c('Solid Snake', 'Metal Gear Solid', 'bowling', 82, 'Teaches bowlers to stay hidden until the very last ball.'),
  c('Gordon Freeman', 'Half-Life', 'batting', 70, 'Says nothing. His crowbar swings do the teaching.'),
  c('GLaDOS', 'Portal', 'bowling', 76, 'Runs every bowler through endless test chambers. For science.'),
  c('Andrew Ryan', 'BioShock', 'batting', 74, 'A man chooses. A slogger obeys.'),
  c('Bayonetta', 'Bayonetta', 'batting', 85, 'Stylish, fast and relentless with the bat.'),
  c('Ryu', 'Street Fighter', 'batting', 86, 'Perfects one clean shot, again and again.'),
  c('Ken Masters', 'Street Fighter', 'batting', 80, 'Flashy, aggressive and loves a big finish.'),
  c('Raiden', 'Mortal Kombat', 'bowling', 78, 'Brings thunder to a fast bowler\'s run-up.'),
  c('Solaire of Astora', 'Dark Souls', 'batting', 66, 'Praise the sun! Patient, cheerful and very optimistic.'),
  c('Gwyn', 'Dark Souls', 'bowling', 84, 'A lord of cinder who has seen every batsman fall.'),
  c('Leon Kennedy', 'Resident Evil', 'fielding', 80, 'Calm under pressure and never misses a target.'),
  c('Albert Wesker', 'Resident Evil', 'bowling', 79, 'Cold, exact and a little too fond of experiments.'),
  c('Deckard Cain', 'Diablo', 'batting', 68, 'Stay a while and listen. Old stories, sound technique.'),
  c('Thrall', 'Warcraft', 'batting', 83, 'Strength and spirit. Teaches power with a purpose.'),
  c('Jaina Proudmoore', 'Warcraft', 'bowling', 81, 'Cool, precise, and a master of control.'),
  c('Jim Raynor', 'StarCraft', 'fielding', 77, 'A scrappy marshal who rebuilds a side from nothing.'),
  c('Samus Aran', 'Metroid', 'fielding', 87, 'Quick, tireless and unbeatable in the field.'),
  c('Marth', 'Fire Emblem', 'batting', 79, 'A prince who leads from the front.'),
  c('Nathan Drake', 'Uncharted', 'fielding', 78, 'Climbs, dives, and somehow always makes the catch.'),
  c('Lara Croft', 'Tomb Raider', 'fielding', 84, 'Fit, fearless and fond of a dramatic diving stop.'),
  c('Arthur Morgan', 'Red Dead Redemption 2', 'batting', 75, 'Gruff, loyal and good for a steady anchor.'),
  c('Carl Johnson', 'GTA: San Andreas', 'batting', 64, 'Keeps it real. Teaches street-smart hitting.'),
  c('Sam Fisher', 'Splinter Cell', 'bowling', 80, 'Silent, patient and deadly with the new ball.'),
  c('Max Payne', 'Max Payne', 'bowling', 69, 'Time slows down when he talks about yorkers.'),
  c('Zagreus', 'Hades', 'fielding', 83, 'Died a hundred times, so he has practised the catch a hundred times.'),
  c('Nyx', 'Hades', 'bowling', 85, 'The night calls: long spells and longer patience.'),
  c('Sans', 'Undertale', 'bowling', 72, 'Takes it easy. Somehow his bowlers never tire.'),
  c('Toriel', 'Undertale', 'batting', 65, 'Kind, patient and very good at teaching the basics.'),
  c('Madeline', 'Celeste', 'fielding', 74, 'Climbs one tough day at a time. Never gives up on a ball.'),
  c('Tom Nook', 'Animal Crossing', 'batting', 62, 'Every run is an investment. Every dot ball, a debt.'),
  c('Isabelle', 'Animal Crossing', 'fielding', 66, 'Cheerful, organised and sharp with the details.'),
  c('Professor Oak', 'Pokemon', 'bowling', 73, 'Studies every delivery. Knows a trainer when he sees one.'),
  c('Brock', 'Pokemon', 'fielding', 70, 'Rock solid in defence, with a hearty lunch for everyone.'),
  c('Cynthia', 'Pokemon', 'batting', 88, 'A champion who teaches the champion\'s mindset.'),
  c('Steven Stone', 'Pokemon', 'fielding', 76, 'Rocks, gems and a very sturdy infield.'),
  c('Mario', 'Super Mario', 'fielding', 72, 'It\'s-a-me! Runs, jumps and loves a dive.'),
  c('Sonic', 'Sonic the Hedgehog', 'fielding', 81, 'Gotta go fast: sprints, throws and quick singles.'),
  c('Crash Bandicoot', 'Crash Bandicoot', 'fielding', 63, 'Spins into the ball and hopes for the best.'),
  c('Kirby', 'Kirby', 'fielding', 60, 'Swallows every catch. Surprisingly effective.'),
  c('Geno', 'Super Mario RPG', 'bowling', 68, 'A star warrior who puts everything into one delivery.'),
  c('Ezreal', 'League of Legends', 'bowling', 77, 'Fires off long-range shots and never stops practising.'),
  c('Jinx', 'League of Legends', 'batting', 71, 'Chaos and fireworks. Your sixes will be loud.'),
  c('Garen', 'League of Legends', 'fielding', 78, 'Demacia! Strong, honest, loud about it.'),
  c('Lux', 'League of Legends', 'bowling', 74, 'Bright, bold and shines in the powerplay.'),
  c('Dante', 'Devil May Cry', 'batting', 87, 'Stylish combos at the crease. Never plays the same shot twice.'),
  c('Vergil', 'Devil May Cry', 'batting', 85, 'Every shot is power. He does not stop to look back.'),
  c('Kazuya Mishima', 'Tekken', 'bowling', 75, 'Ruthless. His bowlers learn fast or they leave.'),
  c('Heihachi Mishima', 'Tekken', 'batting', 77, 'An old bear who still hits harder than anyone.'),
  c('Commander Keen', 'Commander Keen', 'batting', 56, 'An eight-year-old genius. Surprisingly good tactics.'),
  c('Duke Nukem', 'Duke Nukem', 'batting', 67, 'Come get some. Not subtle, but he hits.'),
  c('Guybrush Threepwood', 'Monkey Island', 'bowling', 61, 'A mighty pirate with surprising swing.'),
  c('Rayman', 'Rayman', 'fielding', 65, 'No arms, no legs, no problem. Great at catches anyway.'),
  c('Pac-Man', 'Pac-Man', 'fielding', 71, 'Chases everything down and swallows the ball.'),
  c('Lord British', 'Ultima', 'batting', 69, 'A noble old king who teaches virtue and technique.'),
  c('Gabriel Knight', 'Gabriel Knight', 'bowling', 60, 'A bookshop owner who studies every swing.'),
  c('Sora', 'Kingdom Hearts', 'batting', 82, 'Friendship, a giant key and a surprisingly good bat.'),
  c('Riku', 'Kingdom Hearts', 'bowling', 80, 'Dark, determined and tough on a new ball.'),
  c('Phoenix Wright', 'Ace Attorney', 'bowling', 72, 'Objection! Argues every lbw until the umpire folds.'),
  c('Professor Layton', 'Professor Layton', 'bowling', 79, 'Solves every batsman like a puzzle. Top hat optional.'),
  c('Agent 47', 'Hitman', 'bowling', 86, 'Precise, unseen and efficient. One ball, one wicket.'),
  c('Sackboy', 'LittleBigPlanet', 'fielding', 64, 'Handmade, cheerful and always willing to jump.'),
  c('Ratchet', 'Ratchet & Clank', 'batting', 73, 'Uses a wrench like a bat, with a robot on his shoulder.'),
  c('Spyro', 'Spyro the Dragon', 'bowling', 70, 'Small dragon, big fire. Fast and fiery new ball.'),
  c('Banjo', 'Banjo-Kazooie', 'fielding', 62, 'A bear and a bird who catch anything in the air.'),
  c('Cuphead', 'Cuphead', 'batting', 63, 'A reckless hero who learns from every mistake.'),
  c('Shovel Knight', 'Shovel Knight', 'fielding', 75, 'A shovel for digging in and holding the line.'),
  c('Mega Man', 'Mega Man', 'bowling', 78, 'Copies the best action of every opponent he faces.'),
  c('Simon Belmont', 'Castlevania', 'bowling', 71, 'Whips the new ball round and round.'),
  c('Alucard', 'Castlevania', 'batting', 84, 'Elegant, powerful and quietly in command.'),
]
export const COACH_BY_ID = new Map(COACHES.map((x) => [x.id, x]))
