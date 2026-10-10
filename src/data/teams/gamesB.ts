import { makeTeam, P } from '../builders'

export const elderscrolls = makeTeam(
  {
    id: 'elderscrolls', name: 'Tamriel Dragonborn', short: 'TDB', series: 'The Elder Scrolls', universe: 'game',
    colors: { primary: '#7c2d12', secondary: '#94a3b8' }, home: 'Whiterun', captain: 'Dovahkiin',
  },
  [
    P('Dovahkiin', 'AR', [90, 94, 92, 82], ['f', 80, 90, 86], 86, ['big-match', 'clutch']),
    P('Ulfric Stormcloak', 'BAT', [78, 88, 82, 56], null, 70),
    P('Tiber Septim', 'BAT', [94, 92, 96, 70], null, 76, ['anchor', 'big-match']),
    P('Serana', 'AR', [80, 78, 88, 72], ['l', 80, 90, 78], 74),
    P('Miraak', 'AR', [90, 90, 86, 70], ['m', 82, 90, 78], 74),
    P('Lydia', 'BAT', [66, 76, 76, 60], null, 72),
    P('Brynjolf', 'WK', [64, 56, 78, 86], null, 94, ['safe-hands']),
    P('Alduin', 'BOWL', [70, 96, 66, 50], ['f', 86, 96, 82], 60, ['wicket-taker']),
    P('Paarthurnax', 'BOWL', [50, 90, 80, 40], ['f', 88, 92, 80], 60, ['economical']),
    P('Cicero', 'BOWL', [34, 44, 56, 70], ['o', 62, 80, 60], 66, ['unpredictable']),
    P('J\'zargo', 'BOWL', [30, 56, 50, 56], ['m', 58, 66, 60], 62),
    // bench
    P('Farkas', 'BAT', [58, 84, 66, 60], null, 66),
    P('Vilkas', 'AR', [70, 76, 70, 66], ['m', 68, 68, 70], 70),
    P('Aela the Huntress', 'AR', [74, 70, 76, 76], ['f', 78, 70, 72], 82),
    P('Esbern', 'BOWL', [40, 44, 80, 40], ['o', 74, 78, 66], 60),
    P('Mercer Frey', 'BAT', [72, 68, 66, 80], null, 74),
  ],
)

export const assassinscreed = makeTeam(
  {
    id: 'assassinscreed', name: 'Assassin Brotherhood', short: 'ASB', series: "Assassin's Creed", universe: 'game',
    colors: { primary: '#e5e7eb', secondary: '#7f1d1d' }, home: 'Masyaf', captain: 'Ezio Auditore',
  },
  [
    P('Altair Ibn-La\'Ahad', 'BAT', [92, 82, 94, 86], null, 90, ['anchor']),
    P('Ezio Auditore', 'AR', [90, 86, 92, 90], ['m', 76, 84, 82], 90, ['clutch', 'big-match']),
    P('Bayek of Siwa', 'AR', [86, 86, 90, 76], ['f', 84, 80, 80], 84),
    P('Kassandra', 'AR', [88, 88, 84, 86], ['f', 80, 82, 82], 88),
    P('Eivor', 'BAT', [82, 92, 84, 76], null, 82, ['big-hitter']),
    P('Edward Kenway', 'AR', [82, 84, 74, 80], ['m', 72, 76, 76], 82),
    P('Aveline de Grandpre', 'WK', [74, 64, 80, 88], null, 94, ['safe-hands']),
    P('Connor Kenway', 'AR', [78, 88, 76, 88], ['f', 74, 76, 80], 84),
    P('Shay Cormac', 'BOWL', [60, 66, 70, 72], ['m', 78, 76, 74], 76),
    P('Evie Frye', 'BOWL', [62, 60, 80, 78], ['o', 78, 76, 70], 80),
    P('Leonardo da Vinci', 'BOWL', [30, 30, 70, 40], ['o', 72, 80, 70], 60, ['unpredictable']),
    // bench
    P('Arno Dorian', 'BAT', [76, 74, 78, 84], null, 82),
    P('Haytham Kenway', 'BAT', [84, 76, 90, 66], null, 74, ['anchor']),
    P('Jacob Frye', 'AR', [70, 82, 60, 80], ['l', 68, 80, 64], 78, ['unpredictable']),
    P('Basim Ibn Ishaq', 'AR', [84, 78, 82, 78], ['l', 76, 86, 74], 80),
    P('Desmond Miles', 'BAT', [64, 60, 72, 80], null, 80),
  ],
)

export const zelda = makeTeam(
  {
    id: 'zelda', name: 'Hyrule Heroes', short: 'HYH', series: 'The Legend of Zelda', universe: 'game',
    colors: { primary: '#166534', secondary: '#d4af37' }, home: 'Hyrule Castle', captain: 'Link',
  },
  [
    P('Link', 'AR', [90, 88, 92, 88], ['f', 80, 84, 88], 90, ['big-match', 'clutch']),
    P('Urbosa', 'BAT', [84, 90, 86, 66], null, 76),
    P('Princess Zelda', 'AR', [78, 68, 92, 66], ['l', 84, 92, 80], 72, ['anchor']),
    P('Ganondorf', 'BAT', [86, 98, 82, 56], null, 70, ['big-hitter', 'big-match']),
    P('Midna', 'AR', [78, 76, 80, 82], ['l', 76, 88, 74], 78, ['unpredictable']),
    P('Daruk', 'BAT', [50, 92, 76, 30], null, 66, ['big-hitter']),
    P('Impa', 'WK', [78, 74, 88, 66], null, 92, ['safe-hands']),
    P('Revali', 'BOWL', [56, 60, 60, 80], ['f', 84, 82, 72], 80),
    P('Mipha', 'BOWL', [50, 46, 88, 60], ['o', 82, 80, 76], 70, ['economical']),
    P('Fi', 'BOWL', [44, 44, 90, 60], ['o', 80, 84, 70], 72),
    P('Tingle', 'BOWL', [20, 30, 40, 50], ['m', 50, 70, 50], 56, ['unpredictable']),
    // bench
    P('Sidon', 'BOWL', [46, 62, 74, 60], ['m', 74, 70, 72], 66),
    P('Tetra', 'AR', [68, 66, 70, 84], ['m', 68, 70, 70], 80),
    P('Skull Kid', 'BOWL', [40, 56, 40, 70], ['l', 64, 86, 60], 70, ['unpredictable']),
    P('Sheik', 'BAT', [80, 66, 84, 90], null, 88),
    P('Navi', 'WK', [24, 20, 50, 96], null, 98, ['safe-hands', 'electric-fielder']),
  ],
)

export const masseffect = makeTeam(
  {
    id: 'masseffect', name: 'Normandy Crew', short: 'NMC', series: 'Mass Effect', universe: 'game',
    colors: { primary: '#0b2545', secondary: '#13a4ec' }, home: 'The Citadel', captain: 'Commander Shepard',
  },
  [
    P('Commander Shepard', 'AR', [86, 86, 92, 80], ['m', 80, 84, 82], 84, ['clutch', 'big-match']),
    P('Thane Krios', 'BAT', [88, 80, 92, 84], null, 84, ['anchor']),
    P('Miranda Lawson', 'AR', [76, 72, 84, 70], ['m', 74, 72, 74], 74),
    P('Javik', 'BAT', [86, 84, 86, 70], null, 76),
    P('Urdnot Wrex', 'BAT', [66, 92, 78, 44], null, 64, ['big-hitter']),
    P('Liara T\'Soni', 'AR', [74, 74, 84, 66], ['l', 78, 88, 74], 70),
    P('Tali\'Zorah', 'WK', [64, 56, 80, 72], null, 90, ['safe-hands']),
    P('Garrus Vakarian', 'BOWL', [74, 68, 86, 64], ['f', 90, 86, 78], 80, ['wicket-taker', 'economical']),
    P('Mordin Solus', 'BOWL', [48, 46, 74, 76], ['o', 76, 90, 72], 70),
    P('Samara', 'AR', [70, 70, 86, 66], ['o', 72, 76, 70], 70),
    P('Jeff "Joker" Moreau', 'BOWL', [8, 12, 40, 10], ['m', 30, 36, 40], 50, ['unpredictable']),
    // bench
    P('Jack', 'BAT', [58, 90, 58, 66], null, 66, ['hothead']),
    P('Grunt', 'BAT', [52, 92, 54, 50], null, 60, ['big-hitter']),
    P('Legion', 'AR', [70, 66, 80, 66], ['m', 76, 70, 90], 72),
    P('Harbinger', 'BOWL', [50, 98, 60, 30], ['f', 88, 98, 80], 50, ['wicket-taker']),
    P('Kaidan Alenko', 'BAT', [70, 66, 78, 66], null, 72),
  ],
)

export const overwatch = makeTeam(
  {
    id: 'overwatch', name: 'Overwatch Strike Team', short: 'OWS', series: 'Overwatch', universe: 'game',
    colors: { primary: '#f59e0b', secondary: '#1e3a8a' }, home: 'Watchpoint: Gibraltar', captain: 'Soldier: 76',
  },
  [
    P('Tracer', 'AR', [74, 70, 66, 98], ['f', 70, 72, 86], 90, ['electric-fielder']),
    P('Soldier: 76', 'BAT', [80, 78, 84, 64], null, 74, ['anchor']),
    P('Cassidy', 'BAT', [78, 84, 86, 64], null, 72, ['clutch']),
    P('Genji', 'AR', [80, 84, 70, 90], ['l', 72, 80, 70], 82),
    P('Doomfist', 'BAT', [74, 94, 68, 66], null, 66, ['big-hitter']),
    P('D.Va', 'AR', [74, 76, 72, 88], ['m', 70, 70, 74], 80),
    P('Mercy', 'WK', [58, 40, 84, 70], null, 92, ['safe-hands']),
    P('Widowmaker', 'BOWL', [70, 64, 90, 60], ['f', 92, 80, 70], 72, ['wicket-taker']),
    P('Zenyatta', 'BOWL', [40, 44, 76, 56], ['o', 84, 86, 76], 70),
    P('Junkrat', 'BOWL', [30, 70, 40, 40], ['l', 60, 90, 60], 56, ['unpredictable']),
    P('Ana', 'BOWL', [44, 44, 80, 40], ['m', 82, 74, 66], 68, ['economical']),
    // bench
    P('Reinhardt', 'BAT', [64, 92, 80, 40], null, 62),
    P('Reaper', 'BAT', [70, 88, 64, 70], null, 66, ['hothead']),
    P('Winston', 'AR', [70, 86, 76, 60], ['m', 66, 66, 72], 72),
    P('Hanzo', 'BOWL', [58, 76, 76, 54], ['o', 76, 78, 70], 66),
    P('Pharah', 'BOWL', [50, 66, 64, 66], ['f', 72, 74, 74], 74),
  ],
)

export const halo = makeTeam(
  {
    id: 'halo', name: 'Spartan Fireteam', short: 'SPF', series: 'Halo', universe: 'game',
    colors: { primary: '#3f6212', secondary: '#facc15' }, home: 'Reach', captain: 'Master Chief',
  },
  [
    P('Master Chief', 'AR', [88, 90, 92, 78], ['f', 82, 80, 86], 84, ['clutch', 'big-match']),
    P('Noble Six', 'AR', [84, 82, 86, 76], ['m', 80, 80, 80], 80, ['anchor']),
    P('Jameson Locke', 'AR', [80, 74, 82, 72], ['f', 78, 76, 74], 78),
    P('The Arbiter', 'BAT', [80, 88, 84, 64], null, 76),
    P('Atriox', 'BAT', [86, 94, 80, 70], null, 70, ['big-hitter']),
    P('Kat-B320', 'AR', [72, 66, 80, 74], ['o', 72, 70, 70], 78),
    P('Cortana', 'WK', [82, 40, 96, 60], null, 96, ['safe-hands']),
    P('Jun-A266', 'BOWL', [60, 54, 86, 60], ['f', 90, 78, 72], 74, ['economical']),
    P('Edward Buck', 'BOWL', [56, 60, 70, 60], ['m', 76, 72, 74], 72),
    P('Sergeant Johnson', 'BOWL', [66, 84, 78, 50], ['m', 66, 66, 70], 66),
    P('343 Guilty Spark', 'BOWL', [30, 30, 70, 40], ['l', 66, 92, 60], 60, ['unpredictable']),
    // bench
    P('Jorge-052', 'BAT', [60, 90, 78, 40], null, 62, ['big-hitter']),
    P('Emile-A239', 'BAT', [66, 76, 60, 70], null, 72, ['hothead']),
    P('The Didact', 'BAT', [88, 90, 86, 56], null, 66),
    P('Escharum', 'BOWL', [60, 82, 74, 50], ['f', 78, 76, 74], 64),
    P('Veronica Dare', 'AR', [64, 60, 76, 64], ['m', 70, 68, 70], 72),
  ],
)
