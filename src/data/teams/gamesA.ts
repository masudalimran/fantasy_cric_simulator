import { makeTeam, P } from '../builders'

export const witcher = makeTeam(
  {
    id: 'witcher', name: 'Wolf School Witchers', short: 'WSW', series: 'The Witcher', universe: 'game',
    colors: { primary: '#1f2937', secondary: '#c0c0c0' }, home: 'Kaer Morhen', captain: 'Geralt of Rivia',
  },
  [
    P('Geralt of Rivia', 'AR', [90, 88, 92, 78], ['m', 82, 88, 84], 88, ['anchor', 'clutch', 'big-match']),
    P('Ciri', 'AR', [90, 86, 84, 98], ['f', 76, 86, 80], 94, ['electric-fielder', 'big-match']),
    P('Yennefer of Vengerberg', 'AR', [84, 78, 88, 60], ['l', 80, 92, 74], 70, ['wicket-taker']),
    P('Eredin Breacc Glas', 'BAT', [86, 86, 84, 78], null, 78),
    P('Vesemir', 'AR', [80, 74, 86, 60], ['o', 78, 76, 70], 76, ['anchor']),
    P('Eskel', 'BAT', [80, 80, 80, 70], null, 80),
    P('Triss Merigold', 'AR', [70, 70, 76, 66], ['o', 74, 80, 70], 72),
    P('Regis', 'BOWL', [74, 70, 92, 50], ['l', 84, 90, 84], 70, ['wicket-taker']),
    P('Zoltan Chivay', 'BAT', [60, 88, 76, 40], null, 66, ['big-hitter']),
    P('Dandelion', 'BOWL', [34, 40, 60, 60], ['m', 60, 70, 56], 60, ['unpredictable']),
    P('Roach', 'WK', [34, 30, 50, 90], null, 99, ['safe-hands', 'electric-fielder']),
    // bench
    P('Lambert', 'BAT', [76, 82, 70, 70], null, 78, ['hothead']),
    P('Keira Metz', 'AR', [62, 66, 70, 64], ['o', 70, 72, 66], 70),
    P('Philippa Eilhart', 'BOWL', [56, 54, 86, 60], ['f', 82, 80, 70], 72),
    P('Avallac\'h', 'BOWL', [66, 60, 90, 56], ['l', 82, 90, 76], 70),
    P('Cahir', 'BAT', [72, 78, 70, 74], null, 76),
  ],
)

export const dragonage = makeTeam(
  {
    id: 'dragonage', name: 'Grey Wardens', short: 'GRW', series: 'Dragon Age', universe: 'game',
    colors: { primary: '#3b1d1d', secondary: '#d4af37' }, home: 'Skyhold', captain: 'Garrett Hawke',
  },
  [
    P('Garrett Hawke', 'AR', [82, 82, 86, 76], ['m', 76, 78, 74], 80, ['clutch']),
    P('Cassandra Pentaghast', 'BAT', [80, 84, 82, 66], null, 76),
    P('Solas', 'AR', [90, 86, 90, 72], ['o', 86, 94, 78], 78, ['wicket-taker', 'big-match']),
    P('Cullen Rutherford', 'BAT', [78, 78, 84, 64], null, 74),
    P('Alistair Theirin', 'BAT', [72, 80, 78, 56], null, 76),
    P('Iron Bull', 'BAT', [60, 92, 74, 56], null, 70, ['big-hitter']),
    P('Leliana', 'WK', [74, 60, 84, 84], null, 94, ['safe-hands']),
    P('Morrigan', 'AR', [74, 76, 80, 64], ['l', 80, 88, 72], 70),
    P('Dorian Pavus', 'AR', [76, 78, 76, 64], ['l', 74, 82, 70], 70),
    P('Varric Tethras', 'BOWL', [54, 56, 76, 62], ['m', 82, 80, 74], 72, ['economical']),
    P('Flemeth', 'BOWL', [40, 60, 70, 30], ['l', 70, 92, 60], 60, ['unpredictable']),
    // bench
    P('Anders', 'BOWL', [44, 60, 56, 60], ['m', 68, 80, 66], 66, ['unpredictable']),
    P('Fenris', 'BAT', [76, 88, 62, 66], null, 76, ['hothead']),
    P('Isabela', 'AR', [66, 62, 68, 82], ['o', 66, 74, 68], 78),
    P('Blackwall', 'BAT', [70, 72, 80, 56], null, 70),
    P('Sera', 'BOWL', [36, 50, 44, 80], ['f', 64, 70, 70], 78, ['unpredictable']),
  ],
)

export const dota = makeTeam(
  {
    id: 'dota', name: 'Radiant Ancients', short: 'RAD', series: 'Dota 2', universe: 'game',
    colors: { primary: '#22c55e', secondary: '#b91c1c' }, home: 'The Ancient', captain: 'Invoker',
  },
  [
    P('Phantom Assassin', 'BAT', [82, 90, 72, 86], null, 84, ['big-hitter']),
    P('Anti-Mage', 'BAT', [84, 76, 70, 92], null, 82, ['finisher']),
    P('Juggernaut', 'AR', [82, 86, 84, 82], ['o', 76, 74, 72], 78, ['anchor']),
    P('Invoker', 'AR', [86, 82, 90, 70], ['l', 80, 96, 82], 72, ['wicket-taker', 'unpredictable']),
    P('Shadow Fiend', 'BAT', [80, 94, 66, 70], null, 72, ['finisher']),
    P('Storm Spirit', 'AR', [74, 82, 70, 98], ['f', 70, 82, 80], 82, ['electric-fielder']),
    P('Io', 'WK', [50, 40, 70, 80], null, 95, ['safe-hands']),
    P('Sniper', 'BOWL', [66, 60, 84, 50], ['f', 86, 76, 70], 70, ['economical']),
    P('Pudge', 'BOWL', [30, 70, 50, 40], ['m', 64, 90, 76], 64, ['wicket-taker']),
    P('Crystal Maiden', 'BOWL', [40, 38, 70, 56], ['o', 76, 72, 66], 66),
    P('Earthshaker', 'BOWL', [40, 76, 60, 40], ['f', 74, 78, 72], 66),
    // bench
    P('Axe', 'BAT', [66, 90, 68, 66], null, 72, ['hothead']),
    P('Sven', 'BAT', [76, 92, 76, 64], null, 70),
    P('Lina', 'AR', [70, 88, 66, 70], ['f', 68, 80, 70], 70),
    P('Zeus', 'BOWL', [44, 66, 60, 56], ['f', 76, 84, 68], 66, ['death-specialist']),
    P('Tinker', 'BOWL', [36, 44, 66, 40], ['l', 70, 80, 62], 62),
  ],
)

export const poe = makeTeam(
  {
    id: 'poe', name: 'Wraeclast Exiles', short: 'WEX', series: 'Path of Exile', universe: 'game',
    colors: { primary: '#3a1f0f', secondary: '#c8a24a' }, home: 'Lioneye\'s Watch', captain: 'The Scion',
  },
  [
    P('The Duelist', 'BAT', [80, 84, 78, 74], null, 76),
    P('The Shadow', 'AR', [82, 76, 72, 90], ['l', 78, 86, 74], 82),
    P('Atziri', 'BAT', [88, 88, 92, 70], null, 76, ['big-match']),
    P('The Scion', 'AR', [84, 84, 86, 78], ['m', 78, 82, 80], 80, ['anchor']),
    P('The Templar', 'AR', [80, 80, 86, 64], ['m', 76, 74, 78], 74),
    P('The Marauder', 'BAT', [68, 96, 76, 58], null, 70, ['big-hitter']),
    P('Zana', 'WK', [62, 52, 80, 70], null, 92, ['safe-hands']),
    P('The Ranger', 'AR', [80, 80, 76, 80], ['f', 84, 80, 76], 82, ['economical']),
    P('The Witch', 'AR', [72, 84, 70, 60], ['o', 74, 92, 70], 66, ['wicket-taker']),
    P('Einhar', 'BOWL', [50, 70, 70, 66], ['f', 84, 76, 76], 78),
    P('Shaper of Realms', 'BOWL', [76, 74, 86, 40], ['o', 84, 92, 84], 60, ['wicket-taker']),
    // bench
    P('Kitava', 'BAT', [60, 98, 60, 40], null, 60, ['big-hitter', 'unpredictable']),
    P('Sirus', 'BAT', [86, 90, 80, 70], null, 72),
    P('Niko', 'BOWL', [40, 56, 70, 50], ['m', 72, 78, 70], 64),
    P('Alva', 'AR', [64, 62, 74, 80], ['m', 68, 66, 66], 76),
    P('Maven', 'BOWL', [66, 60, 92, 50], ['l', 80, 94, 76], 66, ['wicket-taker']),
  ],
)

export const finalfantasy = makeTeam(
  {
    id: 'finalfantasy', name: 'Crystal Warriors', short: 'CRW', series: 'Final Fantasy', universe: 'game',
    colors: { primary: '#1e3a8a', secondary: '#e5e7eb' }, home: 'Midgar', captain: 'Cloud Strife',
  },
  [
    P('Cloud Strife', 'AR', [88, 92, 84, 80], ['m', 70, 76, 76], 84, ['big-match']),
    P('Squall Leonhart', 'BAT', [86, 86, 78, 80], null, 80),
    P('Sephiroth', 'AR', [97, 96, 92, 84], ['l', 90, 98, 86], 88, ['big-match', 'wicket-taker']),
    P('Auron', 'BAT', [88, 92, 90, 56], null, 74, ['anchor']),
    P('Tidus', 'AR', [80, 78, 76, 96], ['f', 78, 78, 84], 88, ['electric-fielder']),
    P('Lightning', 'AR', [86, 84, 82, 88], ['f', 80, 78, 80], 84),
    P('Tifa Lockhart', 'WK', [76, 84, 80, 84], null, 92, ['safe-hands']),
    P('Aerith Gainsborough', 'BOWL', [48, 50, 80, 60], ['o', 74, 90, 66], 72),
    P('Lulu', 'BOWL', [44, 70, 74, 40], ['l', 76, 90, 70], 62),
    P('Vivi Ornitier', 'BOWL', [38, 66, 60, 40], ['l', 70, 94, 66], 60, ['unpredictable']),
    P('Barret Wallace', 'BOWL', [40, 78, 64, 40], ['f', 70, 70, 76], 62),
    // bench
    P('Zidane Tribal', 'AR', [78, 76, 74, 94], ['o', 70, 74, 72], 86),
    P('Noctis Lucis Caelum', 'AR', [84, 82, 80, 82], ['m', 76, 80, 76], 82),
    P('Terra Branford', 'AR', [74, 86, 72, 72], ['o', 74, 86, 66], 70),
    P('Kefka Palazzo', 'BOWL', [56, 78, 40, 60], ['l', 66, 94, 66], 66, ['unpredictable']),
    P('Yuna', 'BOWL', [52, 54, 84, 66], ['o', 80, 82, 72], 74),
  ],
)
