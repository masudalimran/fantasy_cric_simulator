import { makeTeam, P } from '../builders'

export const mha = makeTeam(
  {
    id: 'mha', name: 'U.A. Heroes', short: 'UAH', series: 'My Hero Academia', universe: 'anime',
    colors: { primary: '#00a859', secondary: '#e63946' }, home: 'U.A. High School', captain: 'All Might',
  },
  [
    P('Shoto Todoroki', 'AR', [90, 86, 82, 82], ['m', 84, 86, 80], 86, ['anchor']),
    P('All Might', 'BAT', [88, 98, 94, 76], null, 84, ['clutch', 'big-match']),
    P('Izuku Midoriya', 'AR', [76, 92, 84, 80], ['f', 68, 80, 76], 84, ['clutch', 'slow-starter']),
    P('Katsuki Bakugo', 'AR', [80, 94, 66, 82], ['f', 78, 84, 78], 82, ['hothead', 'pace-crusher']),
    P('Endeavor', 'BAT', [78, 92, 74, 60], null, 70, ['big-hitter']),
    P('Hawks', 'AR', [84, 76, 82, 98], ['f', 82, 82, 76], 92, ['powerplay-specialist']),
    P('Ochaco Uraraka', 'WK', [64, 56, 78, 70], null, 92, ['safe-hands']),
    P('Momo Yaoyorozu', 'AR', [78, 62, 84, 66], ['o', 78, 80, 72], 76),
    P('Tenya Iida', 'BOWL', [58, 52, 70, 98], ['f', 78, 66, 90], 84, ['electric-fielder']),
    P('Shota Aizawa', 'BOWL', [58, 60, 80, 70], ['m', 86, 82, 76], 80, ['economical']),
    P('Tomura Shigaraki', 'BOWL', [40, 60, 50, 40], ['l', 72, 92, 66], 60, ['unpredictable']),
    // bench
    P('Eijiro Kirishima', 'BAT', [66, 72, 86, 60], null, 74),
    P('Mirio Togata', 'BAT', [74, 82, 72, 80], null, 82),
    P('Mirko', 'AR', [70, 86, 62, 90], ['f', 72, 78, 80], 80, ['hothead']),
    P('Dabi', 'BAT', [70, 88, 56, 68], null, 70),
    P('Mina Ashido', 'BAT', [52, 56, 60, 74], null, 70),
  ],
)

export const demonslayer = makeTeam(
  {
    id: 'demonslayer', name: 'Demon Slayer Corps', short: 'DSC', series: 'Demon Slayer', universe: 'anime',
    colors: { primary: '#14532d', secondary: '#e11d48' }, home: 'Butterfly Estate', captain: 'Tanjiro Kamado',
  },
  [
    P('Tanjiro Kamado', 'AR', [82, 80, 92, 80], ['m', 78, 82, 80], 86, ['clutch', 'anchor']),
    P('Zenitsu Agatsuma', 'BAT', [78, 84, 40, 96], null, 80, ['unpredictable', 'clutch']),
    P('Giyu Tomioka', 'BAT', [90, 82, 88, 78], null, 86, ['anchor']),
    P('Kyojuro Rengoku', 'BAT', [86, 94, 92, 80], null, 82, ['finisher', 'big-match']),
    P('Kokushibo', 'BAT', [97, 92, 94, 70], null, 80, ['big-match']),
    P('Muichiro Tokito', 'AR', [92, 80, 70, 86], ['o', 84, 86, 76], 86),
    P('Mitsuri Kanroji', 'WK', [70, 86, 76, 82], null, 92, ['safe-hands']),
    P('Tengen Uzui', 'AR', [84, 86, 80, 86], ['f', 78, 82, 74], 86),
    P('Shinobu Kocho', 'BOWL', [74, 56, 90, 80], ['l', 80, 94, 70], 82, ['wicket-taker']),
    P('Sanemi Shinazugawa', 'AR', [80, 90, 56, 80], ['f', 74, 84, 76], 76, ['hothead']),
    P('Genya Shinazugawa', 'BOWL', [30, 50, 50, 60], ['m', 60, 60, 62], 66),
    // bench
    P('Gyomei Himejima', 'BAT', [80, 98, 92, 40], null, 70, ['big-hitter']),
    P('Akaza', 'BAT', [92, 94, 84, 86], null, 84, ['pace-crusher']),
    P('Obanai Iguro', 'BOWL', [66, 62, 76, 80], ['l', 80, 82, 72], 78),
    P('Kanao Tsuyuri', 'BAT', [72, 60, 78, 84], null, 84),
    P('Inosuke Hashibira', 'AR', [66, 86, 60, 88], ['f', 60, 82, 84], 82, ['hothead']),
  ],
)

export const jjk = makeTeam(
  {
    id: 'jjk', name: 'Jujutsu High Sorcerers', short: 'JJS', series: 'Jujutsu Kaisen', universe: 'anime',
    colors: { primary: '#0d1b4c', secondary: '#7c3aed' }, home: 'Tokyo Jujutsu High', captain: 'Satoru Gojo',
  },
  [
    P('Kento Nanami', 'BAT', [86, 72, 98, 66], null, 82, ['anchor']),
    P('Toji Fushiguro', 'BAT', [93, 92, 86, 96], null, 95, ['pace-crusher', 'big-match']),
    P('Satoru Gojo', 'AR', [96, 98, 94, 82], ['l', 92, 98, 90], 90, ['big-match', 'clutch', 'wicket-taker']),
    P('Ryomen Sukuna', 'AR', [95, 97, 88, 80], ['f', 88, 96, 86], 82, ['pace-crusher']),
    P('Yuta Okkotsu', 'AR', [90, 92, 86, 78], ['m', 84, 92, 78], 84),
    P('Maki Zenin', 'AR', [92, 84, 88, 92], ['f', 82, 70, 80], 96),
    P('Yuji Itadori', 'AR', [80, 90, 78, 92], ['f', 66, 76, 84], 90, ['electric-fielder']),
    P('Panda', 'WK', [60, 74, 70, 50], null, 88, ['safe-hands']),
    P('Megumi Fushiguro', 'AR', [82, 74, 86, 76], ['o', 80, 90, 72], 84),
    P('Toge Inumaki', 'BOWL', [40, 50, 66, 56], ['m', 78, 88, 70], 66, ['death-specialist']),
    P('Mahito', 'BOWL', [50, 66, 50, 60], ['o', 74, 94, 66], 70, ['unpredictable']),
    // bench
    P('Nobara Kugisaki', 'BAT', [72, 80, 78, 70], null, 80),
    P('Kinji Hakari', 'BAT', [80, 96, 62, 76], null, 74, ['hothead']),
    P('Aoi Todo', 'BAT', [78, 92, 82, 60], null, 76, ['big-hitter']),
    P('Suguru Geto', 'AR', [84, 78, 90, 70], ['l', 78, 86, 72], 78),
    P('Kenjaku', 'BOWL', [66, 60, 94, 50], ['l', 84, 92, 76], 72, ['wicket-taker']),
  ],
)

export const fma = makeTeam(
  {
    id: 'fma', name: 'State Alchemists', short: 'STA', series: 'Fullmetal Alchemist', universe: 'anime',
    colors: { primary: '#7f1d1d', secondary: '#1e3a8a' }, home: 'Central City', captain: 'Edward Elric',
  },
  [
    P('Roy Mustang', 'BAT', [84, 94, 84, 70], null, 80, ['finisher']),
    P('Edward Elric', 'AR', [80, 84, 82, 84], ['f', 72, 84, 80], 86, ['clutch']),
    P('Riza Hawkeye', 'WK', [84, 60, 92, 68], null, 92, ['safe-hands']),
    P('King Bradley', 'BAT', [92, 86, 90, 86], null, 92, ['pace-crusher']),
    P('Van Hohenheim', 'AR', [90, 90, 92, 60], ['m', 86, 90, 86], 80, ['anchor']),
    P('Alphonse Elric', 'AR', [72, 90, 86, 56], ['m', 78, 74, 94], 78, ['anchor']),
    P('Scar', 'AR', [82, 86, 76, 78], ['l', 74, 84, 70], 80),
    P('Izumi Curtis', 'AR', [78, 76, 84, 70], ['o', 80, 70, 74], 78),
    P('Envy', 'BOWL', [50, 66, 40, 80], ['l', 70, 92, 66], 76, ['unpredictable']),
    P('Greed', 'BOWL', [50, 70, 60, 60], ['f', 80, 76, 74], 70),
    P('Maes Hughes', 'BOWL', [34, 40, 60, 50], ['m', 68, 66, 60], 64),
    // bench
    P('Olivier Armstrong', 'BAT', [86, 84, 92, 70], null, 78, ['anchor']),
    P('Alex Louis Armstrong', 'BAT', [66, 90, 76, 56], null, 66, ['big-hitter']),
    P('Lust', 'AR', [72, 70, 74, 76], ['o', 72, 76, 66], 76),
    P('Winry Rockbell', 'WK', [54, 44, 76, 66], null, 86, ['safe-hands']),
    P('Father', 'BOWL', [80, 86, 90, 40], ['l', 82, 94, 80], 60, ['wicket-taker']),
  ],
)
