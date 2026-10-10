import { makeTeam, P } from '../builders'

export const bleach = makeTeam(
  {
    id: 'bleach', name: 'Soul Reapers', short: 'SOR', series: 'Bleach', universe: 'anime',
    colors: { primary: '#14141c', secondary: '#ff7a1a' }, home: 'Karakura Town', captain: 'Ichigo Kurosaki',
  },
  [
    P('Ichigo Kurosaki', 'AR', [90, 93, 88, 84], ['f', 68, 74, 72], 86, ['clutch', 'big-match']),
    P('Renji Abarai', 'BAT', [76, 82, 72, 76], null, 78, ['pace-crusher']),
    P('Sosuke Aizen', 'AR', [95, 88, 97, 76], ['l', 84, 96, 82], 80, ['anchor', 'wicket-taker', 'big-match']),
    P('Byakuya Kuchiki', 'BAT', [93, 80, 91, 72], null, 82, ['anchor', 'spin-master']),
    P('Kenpachi Zaraki', 'BAT', [50, 97, 52, 62], null, 70, ['hothead', 'big-hitter']),
    P('Toshiro Hitsugaya', 'AR', [80, 74, 78, 80], ['m', 82, 76, 74], 84, ['powerplay-specialist']),
    P('Yoruichi Shihoin', 'WK', [72, 68, 70, 95], null, 97, ['safe-hands', 'electric-fielder']),
    P('Kisuke Urahara', 'BOWL', [62, 60, 88, 60], ['m', 86, 93, 78], 74, ['wicket-taker', 'unpredictable']),
    P('Mayuri Kurotsuchi', 'BOWL', [40, 48, 70, 45], ['l', 74, 92, 70], 66, ['unpredictable']),
    P('Rukia Kuchiki', 'AR', [66, 62, 68, 74], ['o', 76, 72, 72], 82),
    P('Kon', 'BOWL', [10, 22, 15, 40], ['m', 28, 34, 50], 40, ['unpredictable']),
    // bench
    P('Genryusai Yamamoto', 'BAT', [58, 99, 80, 40], null, 60, ['big-hitter', 'big-match']),
    P('Uryu Ishida', 'AR', [70, 66, 72, 70], ['f', 80, 70, 66], 82),
    P('Yasutora Sado', 'BOWL', [40, 74, 60, 50], ['f', 74, 66, 72], 70),
    P('Shunsui Kyoraku', 'AR', [82, 78, 86, 62], ['o', 72, 80, 64], 72, ['clutch']),
    P('Orihime Inoue', 'BAT', [44, 30, 66, 60], null, 80),
  ],
)

export const naruto = makeTeam(
  {
    id: 'naruto', name: 'Hidden Leaf Shinobi', short: 'HLS', series: 'Naruto', universe: 'anime',
    colors: { primary: '#ff8c00', secondary: '#1b3a8a' }, home: 'Konohagakure', captain: 'Naruto Uzumaki',
  },
  [
    P('Naruto Uzumaki', 'AR', [86, 92, 90, 88], ['f', 66, 80, 92], 88, ['clutch', 'big-match', 'finisher']),
    P('Sasuke Uchiha', 'AR', [92, 90, 86, 86], ['f', 74, 86, 80], 90, ['pace-crusher', 'big-match']),
    P('Madara Uchiha', 'BAT', [96, 98, 90, 76], null, 82, ['big-match', 'big-hitter']),
    P('Kakashi Hatake', 'BAT', [94, 82, 92, 80], null, 90, ['anchor', 'spin-master']),
    P('Minato Namikaze', 'AR', [92, 88, 90, 98], ['f', 86, 86, 80], 92, ['powerplay-specialist']),
    P('Itachi Uchiha', 'AR', [95, 84, 98, 80], ['l', 86, 97, 78], 92, ['anchor', 'wicket-taker']),
    P('Shikamaru Nara', 'WK', [82, 58, 92, 68], null, 92, ['safe-hands', 'clutch']),
    P('Jiraiya', 'BOWL', [60, 76, 78, 60], ['m', 78, 88, 74], 76, ['wicket-taker']),
    P('Rock Lee', 'BOWL', [60, 70, 56, 98], ['f', 80, 66, 94], 90, ['electric-fielder']),
    P('Tsunade', 'AR', [56, 84, 70, 56], ['o', 70, 76, 70], 70),
    P('Choji Akimichi', 'BOWL', [34, 66, 50, 36], ['m', 60, 56, 70], 60),
    // bench
    P('Might Guy', 'BAT', [78, 90, 84, 96], null, 88, ['pace-crusher', 'finisher']),
    P('Gaara', 'AR', [88, 80, 92, 52], ['o', 80, 88, 74], 80, ['anchor']),
    P('Neji Hyuga', 'BAT', [86, 70, 84, 78], null, 86, ['slow-starter']),
    P('Orochimaru', 'BOWL', [60, 60, 82, 50], ['l', 80, 94, 66], 66, ['wicket-taker', 'unpredictable']),
    P('Hinata Hyuga', 'BAT', [64, 52, 78, 70], null, 78),
  ],
)

export const dragonball = makeTeam(
  {
    id: 'dragonball', name: 'Universe 7 Warriors', short: 'U7W', series: 'Dragon Ball', universe: 'anime',
    colors: { primary: '#ff9f00', secondary: '#1e5bd8' }, home: 'Kame House', captain: 'Son Goku',
  },
  [
    P('Son Goku', 'AR', [97, 99, 93, 92], ['f', 88, 96, 95], 92, ['clutch', 'big-match', 'finisher']),
    P('Vegeta', 'AR', [95, 97, 88, 88], ['f', 86, 92, 86], 90, ['pace-crusher', 'big-match']),
    P('Son Gohan', 'AR', [90, 94, 80, 86], ['m', 80, 88, 82], 86, ['clutch']),
    P('Piccolo', 'AR', [88, 82, 92, 74], ['o', 88, 86, 84], 90, ['anchor', 'economical']),
    P('Trunks', 'BAT', [88, 90, 82, 88], null, 86, ['finisher']),
    P('Android 18', 'AR', [84, 88, 80, 84], ['f', 82, 76, 78], 88),
    P('Tien Shinhan', 'WK', [76, 74, 78, 78], null, 90, ['safe-hands']),
    P('Krillin', 'AR', [70, 60, 76, 78], ['o', 72, 66, 76], 84),
    P('Frieza', 'BOWL', [60, 86, 82, 70], ['l', 84, 94, 86], 70, ['wicket-taker']),
    P('Beerus', 'BOWL', [70, 96, 40, 70], ['f', 92, 98, 90], 70, ['unpredictable']),
    P('Majin Buu', 'BOWL', [36, 90, 50, 40], ['m', 58, 80, 90], 60, ['unpredictable']),
    // bench
    P('Cell', 'AR', [82, 90, 84, 70], ['f', 82, 88, 84], 78, ['big-match']),
    P('Yamcha', 'BAT', [58, 62, 40, 70], null, 70, ['unpredictable']),
    P('Master Roshi', 'BAT', [60, 66, 86, 30], null, 62, ['anchor']),
    P('Hit', 'BOWL', [84, 86, 88, 92], ['f', 92, 94, 80], 88, ['wicket-taker', 'death-specialist']),
    P('Android 17', 'AR', [80, 82, 82, 82], ['m', 78, 74, 88], 84),
  ],
)

export const onepiece = makeTeam(
  {
    id: 'onepiece', name: 'Grand Line Pirates', short: 'GLP', series: 'One Piece', universe: 'anime',
    colors: { primary: '#c8102e', secondary: '#f5d300' }, home: 'Thousand Sunny', captain: 'Monkey D. Luffy',
  },
  [
    P('Roronoa Zoro', 'BAT', [90, 94, 88, 80], null, 84, ['anchor', 'pace-crusher']),
    P('Sanji', 'AR', [84, 82, 80, 90], ['f', 78, 80, 82], 90, ['electric-fielder']),
    P('Monkey D. Luffy', 'AR', [88, 96, 90, 86], ['f', 64, 90, 84], 88, ['big-match', 'unpredictable', 'clutch']),
    P('Shanks', 'BAT', [96, 94, 98, 76], null, 84, ['anchor', 'big-match']),
    P('Dracule Mihawk', 'BAT', [97, 88, 96, 66], null, 80, ['anchor']),
    P('Trafalgar Law', 'AR', [88, 80, 88, 76], ['l', 82, 90, 76], 80, ['wicket-taker']),
    P('Usopp', 'WK', [60, 58, 60, 66], null, 86, ['safe-hands']),
    P('Jinbe', 'AR', [78, 82, 84, 56], ['o', 82, 76, 78], 74, ['economical']),
    P('Nami', 'AR', [58, 48, 76, 70], ['o', 72, 78, 66], 70),
    P('Franky', 'AR', [60, 82, 70, 40], ['m', 60, 70, 70], 66),
    P('Tony Tony Chopper', 'BOWL', [38, 44, 56, 56], ['m', 66, 72, 70], 62),
    // bench
    P('Portgas D. Ace', 'BAT', [82, 88, 78, 82], null, 80),
    P('Nico Robin', 'BAT', [76, 60, 86, 60], null, 72),
    P('Edward Newgate', 'BAT', [74, 99, 86, 36], null, 60, ['big-hitter', 'big-match']),
    P('Brook', 'BOWL', [52, 56, 70, 66], ['m', 66, 72, 60], 66, ['unpredictable']),
    P('Buggy the Clown', 'BOWL', [30, 40, 60, 40], ['l', 62, 84, 60], 60, ['unpredictable']),
  ],
)

export const aot = makeTeam(
  {
    id: 'aot', name: 'Survey Corps', short: 'SVC', series: 'Attack on Titan', universe: 'anime',
    colors: { primary: '#2e4a2e', secondary: '#c9b458' }, home: 'Wall Maria', captain: 'Erwin Smith',
  },
  [
    P('Levi Ackerman', 'BAT', [93, 84, 92, 92], null, 94, ['anchor', 'pace-crusher']),
    P('Mikasa Ackerman', 'AR', [88, 82, 86, 90], ['f', 80, 78, 76], 94),
    P('Eren Yeager', 'AR', [78, 86, 70, 78], ['f', 74, 84, 80], 84, ['hothead', 'big-match']),
    P('Erwin Smith', 'BAT', [82, 70, 94, 70], null, 80, ['clutch', 'anchor']),
    P('Armin Arlert', 'WK', [70, 52, 92, 64], null, 88, ['safe-hands']),
    P('Hange Zoe', 'AR', [70, 66, 72, 66], ['m', 72, 86, 70], 78, ['unpredictable']),
    P('Jean Kirstein', 'AR', [72, 68, 74, 78], ['m', 72, 66, 74], 80),
    P('Reiner Braun', 'BAT', [68, 86, 78, 60], null, 78),
    P('Annie Leonhart', 'AR', [76, 74, 76, 78], ['o', 76, 72, 70], 82),
    P('Zeke Yeager', 'BOWL', [50, 66, 60, 56], ['f', 84, 90, 78], 70, ['wicket-taker']),
    P('Connie Springer', 'BOWL', [38, 50, 52, 70], ['m', 60, 60, 64], 76),
    // bench
    P('Sasha Braus', 'BOWL', [34, 46, 50, 64], ['m', 58, 52, 68], 76),
    P('Historia Reiss', 'BAT', [58, 50, 72, 60], null, 70),
    P('Floch Forster', 'BAT', [50, 66, 40, 60], null, 62, ['hothead']),
    P('Porco Galliard', 'AR', [64, 72, 66, 66], ['m', 68, 66, 70], 74),
    P('Kenny Ackerman', 'AR', [74, 72, 66, 70], ['o', 70, 70, 66], 80),
  ],
)
