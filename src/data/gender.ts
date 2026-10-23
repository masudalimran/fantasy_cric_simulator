import type { Player } from '../types'

/**
 * Whether a character is a woman or a man, for the studio show's voices (a man should not speak in a woman's voice). The game has no gender field
 * on a player, so the women among the built-in characters (and the youth pool) are listed here by id; every other built-in character is a man.
 * A player from a custom team is unknown (undefined), and then the voice is simply whatever the role gets.
 */
export type Gender = 'f' | 'm'

const FEMALE = new Set([
  // Bleach, Naruto, Dragon Ball, One Piece, Attack on Titan
  'bleach-yoruichi-shihoin', 'bleach-rukia-kuchiki', 'bleach-orihime-inoue', 'naruto-tsunade', 'naruto-hinata-hyuga', 'dragonball-android-18', 'onepiece-nami', 'onepiece-nico-robin',
  'aot-mikasa-ackerman', 'aot-hange-zoe', 'aot-annie-leonhart', 'aot-sasha-braus', 'aot-historia-reiss',
  // My Hero Academia, Demon Slayer, Jujutsu Kaisen, Fullmetal Alchemist, JoJo, Yu-Gi-Oh!
  'mha-ochaco-uraraka', 'mha-momo-yaoyorozu', 'mha-mirko', 'mha-mina-ashido', 'demonslayer-mitsuri-kanroji', 'demonslayer-shinobu-kocho', 'demonslayer-kanao-tsuyuri',
  'jjk-maki-zenin', 'jjk-nobara-kugisaki', 'fma-riza-hawkeye', 'fma-izumi-curtis', 'fma-olivier-armstrong', 'fma-lust', 'fma-winry-rockbell', 'jojo-jolyne-kujo',
  'yugioh-mai-valentine', 'yugioh-tea-gardner', 'yugioh-ishizu-ishtar',
  // Seven Deadly Sins, Inuyasha, The Witcher, Dragon Age, Dota, Path of Exile, Final Fantasy, Elder Scrolls, Assassin's Creed
  'sds-diane', 'sds-elizabeth-liones', 'sds-derieri', 'sds-merlin', 'inuyasha-kagome-higurashi', 'inuyasha-sango', 'inuyasha-kikyo', 'inuyasha-kagura',
  'witcher-ciri', 'witcher-yennefer-of-vengerberg', 'witcher-triss-merigold', 'witcher-keira-metz', 'witcher-philippa-eilhart',
  'dragonage-cassandra-pentaghast', 'dragonage-leliana', 'dragonage-morrigan', 'dragonage-flemeth', 'dragonage-isabela', 'dragonage-sera',
  'dota-phantom-assassin', 'dota-crystal-maiden', 'dota-lina', 'poe-atziri', 'poe-zana', 'poe-the-witch', 'poe-alva', 'poe-maven', 'poe-the-scion',
  'finalfantasy-lightning', 'finalfantasy-tifa-lockhart', 'finalfantasy-aerith-gainsborough', 'finalfantasy-lulu', 'finalfantasy-terra-branford', 'finalfantasy-yuna',
  'elderscrolls-serana', 'elderscrolls-lydia', 'elderscrolls-aela-the-huntress', 'assassinscreed-kassandra', 'assassinscreed-aveline-de-grandpre', 'assassinscreed-evie-frye',
  // the youth pool
  'yt-noelle-silva', 'yt-mimosa-vermillion', 'yt-vanessa-enoteca', 'yt-charmy-pappitson', 'yt-mereoleona-vermillion', 'yt-lucy-heartfilia', 'yt-erza-scarlet', 'yt-wendy-marvell', 'yt-juvia-lockser',
  'yt-mirajane-strauss', 'yt-levy-mcgarden', 'yt-cana-alberona', 'yt-biscuit-krueger', 'yt-machi-komacine', 'yt-pakunoda', 'yt-asuna-yuuki', 'yt-sinon', 'yt-leafa', 'yt-silica', 'yt-lisbeth',
  'yt-alice-zuberg', 'yt-touka-kirishima', 'yt-hinami-fueguchi', 'yt-misa-amane', 'yt-kallen-stadtfeld', 'yt-cornelia-li-britannia', 'yt-rin-tohsaka', 'yt-sakura-matou', 'yt-illyasviel-von-einzbern',
  'yt-emilia', 'yt-rem', 'yt-ram', 'yt-beatrice', 'yt-aqua', 'yt-megumin', 'yt-darkness', 'yt-yunyun', 'yt-wiz', 'yt-yor-forger', 'yt-anya-forger', 'yt-becky-blackbell', 'yt-yuri-briar',
  'yt-power', 'yt-makima', 'yt-kobeni-higashiyama', 'yt-himeno', 'yt-reze', 'yt-tatsumaki', 'yt-fubuki', 'yt-yuzuriha-ogawa', 'yt-maki-oze', 'yt-iris', 'yt-tamaki-kotatsu', 'yt-princess-hibana',
  'yt-maka-albarn', 'yt-tsubaki-nakatsukasa', 'yt-genkai', 'yt-faye-valentine', 'yt-rei-ayanami', 'yt-asuka-langley', 'yt-misato-katsuragi', 'yt-frieren', 'yt-fern', 'yt-ubel',
  'yt-rangiku-matsumoto', 'yt-soi-fon', 'yt-sarada-uchiha', 'yt-tenten', 'yt-temari', 'yt-kushina-uzumaki', 'yt-anko-mitarashi', 'yt-ino-yamanaka', 'yt-sakura-haruno', 'yt-tsuyu-asui',
  'yt-nejire-hado', 'yt-himiko-toga', 'yt-kyoka-jiro', 'yt-nezuko-kamado', 'yt-sasha-blouse', 'yt-gabi-braun', 'yt-pieck-finger', 'yt-boa-hancock', 'yt-videl', 'yt-caulifla', 'yt-bulma',
])
export const FEMALE_IDS: ReadonlySet<string> = FEMALE
const BUILT_IN_PREFIX = /^(bleach|naruto|dragonball|onepiece|aot|mha|demonslayer|jjk|fma|jojo|yugioh|sds|inuyasha|witcher|dragonage|dota|poe|finalfantasy|elderscrolls|assassinscreed|yt)-/

export function genderOfId(id: string): Gender | undefined {
  if (FEMALE.has(id)) return 'f'
  return BUILT_IN_PREFIX.test(id) ? 'm' : undefined
}
export const genderOf = (p: Pick<Player, 'id'>): Gender | undefined => genderOfId(p.id)
