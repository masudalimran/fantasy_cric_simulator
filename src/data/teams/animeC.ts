import { makeTeam, P } from '../builders'

export const jojo = makeTeam(
  {
    id: 'jojo', name: 'Stand Users', short: 'STU', series: "JoJo's Bizarre Adventure", universe: 'anime',
    colors: { primary: '#4c1d95', secondary: '#facc15' }, home: 'Morioh', captain: 'Jotaro Kujo',
  },
  [
    P('Jotaro Kujo', 'AR', [92, 90, 92, 78], ['f', 82, 88, 80], 86, ['clutch', 'big-match']),
    P('Joseph Joestar', 'AR', [84, 78, 88, 70], ['m', 74, 92, 70], 78, ['unpredictable']),
    P('Dio Brando', 'AR', [94, 94, 90, 82], ['f', 88, 96, 86], 88, ['big-match', 'wicket-taker']),
    P('Giorno Giovanna', 'AR', [86, 82, 90, 80], ['o', 82, 90, 76], 84, ['clutch']),
    P('Josuke Higashikata', 'AR', [80, 84, 76, 80], ['m', 74, 80, 76], 82),
    P('Jolyne Kujo', 'BOWL', [60, 66, 74, 74], ['f', 78, 76, 76], 80),
    P('Noriaki Kakyoin', 'WK', [80, 70, 84, 70], null, 90, ['safe-hands']),
    P('Jean Pierre Polnareff', 'BAT', [82, 80, 72, 86], null, 84, ['pace-crusher']),
    P('Bruno Bucciarati', 'AR', [86, 76, 92, 76], ['o', 80, 82, 72], 80, ['anchor']),
    P('Yoshikage Kira', 'BOWL', [60, 64, 86, 60], ['l', 84, 92, 70], 70, ['wicket-taker']),
    P('Rohan Kishibe', 'BOWL', [44, 44, 70, 50], ['m', 72, 80, 64], 62, ['unpredictable']),
    // bench
    P('Jonathan Joestar', 'BAT', [84, 88, 90, 60], null, 78, ['anchor']),
    P('Caesar Zeppeli', 'AR', [74, 72, 70, 78], ['o', 70, 78, 70], 78),
    P('Guido Mista', 'BOWL', [48, 66, 60, 60], ['f', 70, 70, 68], 74),
    P('Narancia Ghirga', 'BAT', [60, 58, 56, 86], null, 82),
    P('Okuyasu Nijimura', 'BAT', [56, 86, 54, 70], null, 66, ['hothead']),
  ],
)

export const yugioh = makeTeam(
  {
    id: 'yugioh', name: 'Duelist Kingdom', short: 'DUK', series: 'Yu-Gi-Oh!', universe: 'anime',
    colors: { primary: '#1e1b4b', secondary: '#f59e0b' }, home: 'Domino City', captain: 'Yugi Muto',
  },
  [
    P('Yugi Muto', 'AR', [80, 72, 94, 70], ['o', 80, 84, 72], 74, ['clutch', 'big-match']),
    P('Atem', 'AR', [94, 88, 96, 74], ['l', 86, 94, 76], 80, ['big-match', 'clutch']),
    P('Seto Kaiba', 'BAT', [90, 92, 74, 70], null, 76, ['hothead', 'big-hitter']),
    P('Joey Wheeler', 'AR', [70, 82, 66, 84], ['f', 66, 74, 80], 82, ['unpredictable']),
    P('Mai Valentine', 'AR', [76, 70, 82, 78], ['o', 76, 80, 68], 80),
    P('Marik Ishtar', 'BOWL', [66, 70, 90, 64], ['l', 82, 92, 74], 72, ['wicket-taker']),
    P('Tea Gardner', 'WK', [62, 54, 78, 82], null, 90, ['safe-hands']),
    P('Maximillion Pegasus', 'BOWL', [60, 56, 84, 50], ['m', 80, 90, 66], 66, ['unpredictable']),
    P('Tristan Taylor', 'BAT', [64, 80, 60, 74], null, 74),
    P('Ryou Bakura', 'BAT', [72, 60, 76, 70], null, 76),
    P('Mokuba Kaiba', 'BOWL', [40, 44, 64, 78], ['m', 68, 68, 64], 78),
    // bench
    P('Duke Devlin', 'AR', [68, 66, 72, 70], ['m', 70, 74, 66], 72),
    P('Ishizu Ishtar', 'BOWL', [50, 46, 84, 56], ['o', 76, 82, 70], 68),
    P('Odion', 'BAT', [58, 84, 74, 50], null, 66),
    P('Weevil Underwood', 'BOWL', [44, 54, 56, 60], ['f', 66, 70, 66], 66, ['hothead']),
    P('Rex Raptor', 'BAT', [58, 82, 52, 56], null, 60, ['big-hitter']),
  ],
)

export const sds = makeTeam(
  {
    id: 'sds', name: 'Seven Deadly Sins', short: 'SDS', series: 'The Seven Deadly Sins', universe: 'anime',
    colors: { primary: '#7f1d1d', secondary: '#fcd34d' }, home: 'Boar Hat', captain: 'Meliodas',
  },
  [
    P('Meliodas', 'AR', [94, 96, 90, 84], ['f', 86, 92, 88], 88, ['clutch', 'big-match']),
    P('Ban', 'AR', [82, 90, 80, 74], ['f', 76, 84, 96], 84, ['electric-fielder']),
    P('King', 'AR', [84, 84, 86, 82], ['o', 80, 86, 76], 86),
    P('Diane', 'BAT', [76, 94, 70, 56], null, 74, ['big-hitter']),
    P('Gowther', 'BOWL', [70, 70, 88, 66], ['l', 82, 94, 72], 72, ['unpredictable', 'wicket-taker']),
    P('Merlin', 'AR', [92, 88, 96, 70], ['l', 86, 96, 76], 80, ['big-match']),
    P('Escanor', 'BAT', [90, 99, 80, 62], null, 72, ['big-hitter', 'finisher']),
    P('Elizabeth Liones', 'WK', [58, 44, 80, 72], null, 88, ['safe-hands']),
    P('Zeldris', 'AR', [88, 90, 86, 80], ['f', 82, 88, 82], 84),
    P('Estarossa', 'BOWL', [76, 82, 74, 80], ['f', 80, 88, 78], 80),
    P('Gilthunder', 'BOWL', [70, 76, 76, 74], ['m', 74, 78, 72], 76),
    // bench
    P('Hendrickson', 'BAT', [76, 86, 70, 64], null, 68, ['hothead']),
    P('Derieri', 'BOWL', [56, 68, 74, 64], ['o', 72, 76, 66], 70),
    P('Monspeet', 'AR', [74, 78, 80, 68], ['m', 72, 78, 70], 72),
    P('Hawk', 'BOWL', [26, 40, 60, 60], ['m', 56, 64, 64], 68, ['unpredictable']),
    P('Griamore', 'BAT', [66, 78, 64, 66], null, 70),
  ],
)

export const inuyasha = makeTeam(
  {
    id: 'inuyasha', name: 'Feudal Warriors', short: 'FDW', series: 'InuYasha', universe: 'anime',
    colors: { primary: '#991b1b', secondary: '#f5f5f4' }, home: 'Sengoku Japan', captain: 'Inuyasha',
  },
  [
    P('Inuyasha', 'AR', [84, 92, 78, 86], ['f', 74, 84, 88], 86, ['pace-crusher', 'clutch']),
    P('Kagome Higurashi', 'AR', [64, 60, 84, 74], ['m', 78, 78, 70], 78, ['clutch']),
    P('Sesshomaru', 'AR', [94, 90, 92, 84], ['l', 86, 94, 82], 88, ['anchor', 'big-match']),
    P('Miroku', 'AR', [78, 76, 80, 70], ['o', 76, 84, 70], 76, ['unpredictable']),
    P('Sango', 'AR', [80, 80, 82, 82], ['f', 78, 76, 80], 88),
    P('Shippo', 'WK', [44, 46, 60, 90], null, 86, ['safe-hands', 'electric-fielder']),
    P('Kikyo', 'BOWL', [70, 62, 90, 64], ['m', 84, 84, 74], 76, ['economical']),
    P('Naraku', 'AR', [88, 86, 88, 70], ['l', 82, 94, 78], 78, ['wicket-taker', 'big-match']),
    P('Kagura', 'BOWL', [66, 66, 70, 88], ['o', 74, 82, 68], 82),
    P('Koga', 'BAT', [76, 80, 66, 96], null, 90, ['finisher']),
    P('Bankotsu', 'BAT', [82, 92, 70, 70], null, 76, ['big-hitter']),
    // bench
    P('Totosai', 'BOWL', [38, 34, 74, 40], ['o', 66, 72, 56], 60),
    P('Jaken', 'BOWL', [30, 40, 50, 60], ['m', 58, 60, 62], 64, ['unpredictable']),
    P('Jakotsu', 'BAT', [70, 72, 60, 82], null, 76, ['unpredictable']),
    P('Kohaku', 'AR', [66, 68, 64, 74], ['f', 66, 70, 70], 78),
    P('Hakudoshi', 'BOWL', [56, 62, 60, 62], ['l', 70, 80, 62], 66),
  ],
)
