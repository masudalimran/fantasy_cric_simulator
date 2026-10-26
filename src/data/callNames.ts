/**
 * What a character is called on a name plate and the score bar. The first name is right for most (Ichigo, Naruto, Tanjiro) but not for the many
 * whose first word is a family name or a title ("Son Goku" is Goku, "Roy Mustang" is Mustang, "Edward Newgate" is Whitebeard). Anyone not listed here
 * (a youth-pool or custom player) is called by his first name.
 */
const TEAMS: Record<string, [string, string][]> = {
  bleach: [['sosuke-aizen', 'Aizen'], ['kisuke-urahara', 'Urahara'], ['genryusai-yamamoto', 'Yamamoto'], ['yasutora-sado', 'Chad'], ['toshiro-hitsugaya', 'Hitsugaya']],
  naruto: [['rock-lee', 'Lee'], ['might-guy', 'Guy']],
  dragonball: [['son-goku', 'Goku'], ['son-gohan', 'Gohan'], ['android-18', 'Android 18'], ['android-17', 'Android 17'], ['majin-buu', 'Buu'], ['master-roshi', 'Roshi']],
  onepiece: [['roronoa-zoro', 'Zoro'], ['dracule-mihawk', 'Mihawk'], ['trafalgar-law', 'Law'], ['tony-tony-chopper', 'Chopper'], ['portgas-d-ace', 'Ace'], ['nico-robin', 'Robin'], ['edward-newgate', 'Whitebeard'], ['buggy-the-clown', 'Buggy']],
  mha: [['shoto-todoroki', 'Todoroki'], ['izuku-midoriya', 'Deku'], ['katsuki-bakugo', 'Bakugo'], ['ochaco-uraraka', 'Uraraka'], ['momo-yaoyorozu', 'Yaoyorozu'], ['tenya-iida', 'Iida'], ['shota-aizawa', 'Aizawa'], ['tomura-shigaraki', 'Shigaraki'], ['eijiro-kirishima', 'Kirishima'], ['mina-ashido', 'Mina']],
  demonslayer: [['kyojuro-rengoku', 'Rengoku'], ['genya-shinazugawa', 'Genya'], ['sanemi-shinazugawa', 'Sanemi']],
  jjk: [['kento-nanami', 'Nanami'], ['satoru-gojo', 'Gojo'], ['ryomen-sukuna', 'Sukuna'], ['toge-inumaki', 'Inumaki'], ['kinji-hakari', 'Hakari'], ['aoi-todo', 'Todo'], ['suguru-geto', 'Geto']],
  fma: [['roy-mustang', 'Mustang'], ['edward-elric', 'Edward'], ['riza-hawkeye', 'Hawkeye'], ['king-bradley', 'Bradley'], ['van-hohenheim', 'Hohenheim'], ['alphonse-elric', 'Alphonse'], ['maes-hughes', 'Hughes'], ['olivier-armstrong', 'Olivier'], ['alex-louis-armstrong', 'Armstrong']],
  jojo: [['noriaki-kakyoin', 'Kakyoin'], ['jean-pierre-polnareff', 'Polnareff'], ['bruno-bucciarati', 'Bucciarati'], ['yoshikage-kira', 'Kira'], ['guido-mista', 'Mista']],
  yugioh: [['seto-kaiba', 'Kaiba'], ['maximillion-pegasus', 'Pegasus'], ['ryou-bakura', 'Bakura']],
  dragonage: [['garrett-hawke', 'Hawke'], ['iron-bull', 'Iron Bull']],
  dota: [['phantom-assassin', 'Phantom Assassin'], ['shadow-fiend', 'Shadow Fiend'], ['storm-spirit', 'Storm Spirit'], ['crystal-maiden', 'Crystal Maiden']],
  poe: [['the-duelist', 'Duelist'], ['the-shadow', 'Shadow'], ['the-scion', 'Scion'], ['the-templar', 'Templar'], ['the-marauder', 'Marauder'], ['the-ranger', 'Ranger'], ['the-witch', 'Witch'], ['shaper-of-realms', 'Shaper']],
  masseffect: [['commander-shepard', 'Shepard'], ['thane-krios', 'Thane'], ['urdnot-wrex', 'Wrex'], ['tali-zorah', 'Tali'], ['jeff-joker-moreau', 'Joker']],
  overwatch: [['soldier-76', 'Soldier 76']],
  halo: [['master-chief', 'Chief'], ['noble-six', 'Noble Six'], ['jameson-locke', 'Locke'], ['the-arbiter', 'Arbiter'], ['kat-b320', 'Kat'], ['jun-a266', 'Jun'], ['edward-buck', 'Buck'], ['sergeant-johnson', 'Johnson'], ['343-guilty-spark', 'Guilty Spark'], ['jorge-052', 'Jorge'], ['emile-a239', 'Emile'], ['the-didact', 'Didact'], ['veronica-dare', 'Dare']],
  zelda: [['princess-zelda', 'Zelda']],
}

export const CALL_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(TEAMS).flatMap(([team, rows]) => rows.map(([who, name]): [string, string] => [`${team}-${who}`, name])),
)
