import type { Move, MoveStyle } from './moves'

/**
 * A signature move for every player in every built-in squad (the stars with a hand-picked one in `moves.ts` override these). Written as short rows
 * per team: [the end of the player's id, what is shouted, the look, the colours].
 */
const PAL = {
  blue: ['#38bdf8', '#e0f2fe'], ice: ['#7dd3fc', '#f0f9ff'], red: ['#ef4444', '#fecaca'], fire: ['#f97316', '#fde047'], gold: ['#fbbf24', '#fffbeb'],
  green: ['#22c55e', '#bbf7d0'], purple: ['#a855f7', '#f5d0fe'], pink: ['#f472b6', '#fdf2f8'], white: ['#e5e7eb', '#ffffff'], dark: ['#111827', '#ef4444'],
  teal: ['#2dd4bf', '#ecfeff'], silver: ['#94a3b8', '#f1f5f9'], lime: ['#a3e635', '#ecfccb'], violet: ['#6366f1', '#e0e7ff'], crimson: ['#b91c1c', '#fca5a5'], brown: ['#b45309', '#fde68a'],
} as const
type Pal = keyof typeof PAL
type Row = [string, string, MoveStyle, Pal]

const TEAMS: Record<string, Row[]> = {
  bleach: [
    ['renji-abarai', 'ROAR, ZABIMARU!', 'slash', 'red'], ['sosuke-aizen', 'KYOKA SUIGETSU!', 'pulse', 'purple'], ['kisuke-urahara', 'BENIHIME!', 'flame', 'red'],
    ['mayuri-kurotsuchi', 'ASHISOGI JIZO!', 'lightning', 'purple'], ['rukia-kuchiki', 'SODE NO SHIRAYUKI!', 'beam', 'ice'], ['kon', 'KON KICK!', 'rush', 'green'],
    ['uryu-ishida', 'QUINCY ARROW!', 'beam', 'blue'], ['yasutora-sado', 'EL DIRECTO!', 'rush', 'brown'], ['shunsui-kyoraku', 'KATEN KYOKOTSU!', 'slash', 'pink'],
    ['orihime-inoue', 'SANTEN KESSHUN!', 'rune', 'gold'], ['yoruichi-shihoin', 'SHUNKO!', 'lightning', 'gold'],
  ],
  naruto: [
    ['naruto-uzumaki', 'RASENSHURIKEN!', 'sphere', 'blue'], ['minato-namikaze', 'FLYING RAIJIN!', 'rush', 'gold'], ['shikamaru-nara', 'SHADOW BIND!', 'pulse', 'purple'],
    ['jiraiya', 'GIANT RASENGAN!', 'sphere', 'blue'], ['rock-lee', 'HIDDEN LOTUS!', 'rush', 'green'], ['tsunade', 'HEAVENLY KICK OF PAIN!', 'pulse', 'pink'],
    ['choji-akimichi', 'HUMAN BULLET TANK!', 'rush', 'fire'], ['gaara', 'SAND BURIAL!', 'pulse', 'brown'], ['neji-hyuga', 'EIGHT TRIGRAMS!', 'rune', 'blue'],
    ['orochimaru', 'KUSANAGI SLASH!', 'slash', 'purple'], ['hinata-hyuga', 'GENTLE FIST!', 'pulse', 'blue'],
  ],
  dragonball: [
    ['android-18', 'ENERGY BLAST!', 'beam', 'gold'], ['trunks', 'BURNING ATTACK!', 'beam', 'fire'], ['majin-buu', 'CHOCOLATE BEAM!', 'beam', 'pink'],
    ['cell', 'SOLAR KAMEHAMEHA!', 'beam', 'green'], ['yamcha', 'WOLF FANG FIST!', 'rush', 'fire'], ['master-roshi', 'MAX POWER KAMEHAMEHA!', 'beam', 'gold'],
    ['hit', 'TIME SKIP!', 'pulse', 'purple'], ['android-17', 'BARRIER BLAST!', 'pulse', 'green'],
  ],
  onepiece: [
    ['nami', 'THUNDER TEMPO!', 'lightning', 'blue'], ['usopp', 'FIRE STAR!', 'flame', 'red'], ['jinbe', 'FISH-MAN KARATE!', 'pulse', 'blue'],
    ['franky', 'RADICAL BEAM!', 'beam', 'teal'], ['tony-tony-chopper', 'MONSTER POINT!', 'rush', 'pink'], ['nico-robin', 'DOS FLEUR!', 'pulse', 'purple'],
    ['brook', 'SOUL SOLID!', 'slash', 'ice'], ['buggy-the-clown', 'BUGGY BALL!', 'sphere', 'red'], ['shanks', 'CONQUEROR\'S HAKI!', 'pulse', 'red'],
    ['trafalgar-law', 'SHAMBLES!', 'rune', 'blue'],
  ],
  aot: [
    ['mikasa-ackerman', 'ACKERMAN SLASH!', 'slash', 'silver'], ['eren-yeager', 'ATTACK TITAN!', 'flame', 'fire'], ['erwin-smith', 'FINAL CHARGE!', 'rush', 'white'],
    ['armin-arlert', 'COLOSSAL BLAST!', 'flame', 'fire'], ['hange-zoe', 'THUNDER SPEAR!', 'beam', 'gold'], ['jean-kirstein', 'ODM STRIKE!', 'slash', 'green'],
    ['reiner-braun', 'ARMORED TITAN!', 'pulse', 'silver'], ['annie-leonhart', 'CRYSTAL KICK!', 'rush', 'ice'], ['zeke-yeager', 'TITAN SCREAM!', 'pulse', 'brown'],
    ['connie-springer', 'BLADE SPIN!', 'slash', 'white'], ['sasha-braus', 'ARROW SHOT!', 'beam', 'brown'], ['historia-reiss', 'ROYAL BLOOD!', 'rune', 'gold'],
    ['floch-forster', 'SUICIDE CHARGE!', 'rush', 'red'], ['porco-galliard', 'JAW TITAN!', 'rush', 'silver'], ['kenny-ackerman', 'UNIT SLAUGHTER!', 'slash', 'dark'],
  ],
  mha: [
    ['ochaco-uraraka', 'ZERO GRAVITY!', 'sphere', 'pink'], ['momo-yaoyorozu', 'CREATION!', 'rune', 'red'], ['tenya-iida', 'RECIPRO BURST!', 'rush', 'blue'],
    ['shota-aizawa', 'ERASURE!', 'pulse', 'red'], ['tomura-shigaraki', 'DECAY!', 'pulse', 'dark'], ['eijiro-kirishima', 'RED RIOT!', 'rush', 'red'],
    ['mirio-togata', 'PERMEATION!', 'pulse', 'gold'], ['mirko', 'LUNAR FALL!', 'rush', 'white'], ['dabi', 'BLUE FLAME!', 'flame', 'blue'],
    ['mina-ashido', 'ACID VEIL!', 'pulse', 'pink'], ['hawks', 'FIERCE WINGS!', 'slash', 'red'],
  ],
  demonslayer: [
    ['giyu-tomioka', 'WATER SURFACE SLASH!', 'slash', 'blue'], ['kokushibo', 'MOON BREATHING!', 'slash', 'purple'], ['muichiro-tokito', 'MIST BREATHING!', 'slash', 'ice'],
    ['mitsuri-kanroji', 'LOVE BREATHING!', 'slash', 'pink'], ['tengen-uzui', 'SOUND BREATHING!', 'pulse', 'gold'], ['shinobu-kocho', 'INSECT BREATHING!', 'slash', 'purple'],
    ['sanemi-shinazugawa', 'WIND BREATHING!', 'slash', 'green'], ['genya-shinazugawa', 'DEMON GUN!', 'beam', 'dark'], ['gyomei-himejima', 'STONE BREATHING!', 'rush', 'brown'],
    ['akaza', 'DESTRUCTIVE DEATH!', 'pulse', 'pink'], ['obanai-iguro', 'SERPENT BREATHING!', 'slash', 'green'], ['kanao-tsuyuri', 'FLOWER BREATHING!', 'slash', 'pink'],
    ['inosuke-hashibira', 'BEAST BREATHING!', 'slash', 'teal'],
  ],
  jjk: [
    ['kento-nanami', 'RATIO TECHNIQUE!', 'slash', 'gold'], ['toji-fushiguro', 'INVERTED SPEAR!', 'slash', 'dark'], ['yuta-okkotsu', 'RIKA!', 'beam', 'pink'],
    ['maki-zenin', 'PLAYFUL CLOUD!', 'slash', 'green'], ['panda', 'GORILLA MODE!', 'rush', 'white'], ['megumi-fushiguro', 'DIVINE DOGS!', 'pulse', 'dark'],
    ['toge-inumaki', 'CURSED SPEECH: BLAST AWAY!', 'pulse', 'white'], ['mahito', 'IDLE TRANSFIGURATION!', 'pulse', 'purple'], ['nobara-kugisaki', 'RESONANCE!', 'rune', 'red'],
    ['kinji-hakari', 'JACKPOT!', 'pulse', 'pink'], ['aoi-todo', 'BOOGIE WOOGIE!', 'rush', 'brown'], ['suguru-geto', 'CURSED SPIRIT MANIPULATION!', 'pulse', 'dark'],
    ['kenjaku', 'CURSE WOMB!', 'pulse', 'purple'],
  ],
  fma: [
    ['edward-elric', 'AUTOMAIL BLADE!', 'lightning', 'blue'], ['riza-hawkeye', 'SNIPER SHOT!', 'beam', 'gold'], ['king-bradley', 'ULTIMATE EYE!', 'slash', 'dark'],
    ['van-hohenheim', 'PHILOSOPHER\'S STONE!', 'rune', 'gold'], ['alphonse-elric', 'ARMOR PUNCH!', 'lightning', 'blue'], ['scar', 'DECONSTRUCTION!', 'pulse', 'red'],
    ['izumi-curtis', 'HAND CLAP!', 'lightning', 'silver'], ['envy', 'MONSTER FORM!', 'rush', 'purple'], ['greed', 'ULTIMATE SHIELD!', 'pulse', 'dark'],
    ['maes-hughes', 'KNIFE THROW!', 'slash', 'silver'], ['olivier-armstrong', 'ICE QUEEN!', 'slash', 'ice'], ['alex-louis-armstrong', 'MUSCLE ALCHEMY!', 'rush', 'pink'],
    ['lust', 'SPEAR FINGERS!', 'slash', 'purple'], ['winry-rockbell', 'WRENCH SMASH!', 'rush', 'silver'], ['father', 'GATE OF TRUTH!', 'sphere', 'dark'],
  ],
  jojo: [
    ['joseph-joestar', 'HERMIT PURPLE!', 'lightning', 'purple'], ['jolyne-kujo', 'STONE FREE!', 'rush', 'teal'], ['noriaki-kakyoin', 'EMERALD SPLASH!', 'beam', 'green'],
    ['jean-pierre-polnareff', 'SILVER CHARIOT!', 'slash', 'silver'], ['bruno-bucciarati', 'STICKY FINGERS!', 'rush', 'gold'], ['yoshikage-kira', 'KILLER QUEEN!', 'sphere', 'pink'],
    ['rohan-kishibe', 'HEAVEN\'S DOOR!', 'rune', 'gold'], ['jonathan-joestar', 'SUNLIGHT YELLOW OVERDRIVE!', 'lightning', 'gold'], ['caesar-zeppeli', 'SOAP BUBBLE LAUNCHER!', 'sphere', 'pink'],
    ['guido-mista', 'SEX PISTOLS!', 'rush', 'red'], ['narancia-ghirga', 'AEROSMITH!', 'beam', 'blue'], ['okuyasu-nijimura', 'THE HAND!', 'pulse', 'violet'],
  ],
  yugioh: [
    ['atem', 'OBELISK THE TORMENTOR!', 'rush', 'blue'], ['mai-valentine', 'HARPIE\'S FEATHER STORM!', 'slash', 'purple'], ['marik-ishtar', 'WINGED DRAGON OF RA!', 'flame', 'gold'],
    ['tea-gardner', 'POWER OF FRIENDSHIP!', 'pulse', 'pink'], ['maximillion-pegasus', 'MILLENNIUM EYE!', 'rune', 'gold'], ['tristan-taylor', 'TRISTAN\'S TACKLE!', 'rush', 'brown'],
    ['ryou-bakura', 'DIABOUND BLAST!', 'flame', 'dark'], ['mokuba-kaiba', 'BIG BROTHER BEAM!', 'beam', 'blue'], ['duke-devlin', 'DICE MONSTER!', 'rune', 'red'],
    ['ishizu-ishtar', 'MILLENNIUM NECKLACE!', 'rune', 'gold'], ['odion', 'TOMB GUARDIAN!', 'rush', 'brown'], ['weevil-underwood', 'INSECT SWARM!', 'pulse', 'lime'],
    ['rex-raptor', 'DINO ROAR!', 'pulse', 'lime'],
  ],
  sds: [
    ['ban', 'SNATCH!', 'rush', 'red'], ['king', 'GUARDIAN KING!', 'beam', 'pink'], ['diane', 'GIANT\'S HAMMER!', 'rush', 'brown'], ['gowther', 'HARLEQUIN?!', 'pulse', 'pink'],
    ['merlin', 'INFINITY!', 'rune', 'purple'], ['elizabeth-liones', 'GODDESS\'S GRACE!', 'rune', 'gold'], ['zeldris', 'COMMANDMENT OF ZEAL!', 'slash', 'dark'],
    ['estarossa', 'FULL COUNTER!', 'pulse', 'red'], ['gilthunder', 'PARALYZING THUNDER!', 'lightning', 'gold'], ['hendrickson', 'DEMON POWER!', 'pulse', 'dark'],
    ['derieri', 'GIANT STRIKE!', 'rush', 'pink'], ['monspeet', 'ICE LANCE!', 'slash', 'ice'], ['hawk', 'MY GARBAGE-EATING POWER!', 'rush', 'pink'], ['griamore', 'AXE OF DEMONS!', 'slash', 'silver'],
  ],
  inuyasha: [
    ['inuyasha', 'WIND SCAR!', 'slash', 'gold'], ['miroku', 'WIND TUNNEL!', 'pulse', 'dark'], ['sango', 'HIRAIKOTSU!', 'slash', 'silver'], ['shippo', 'FOX FIRE!', 'flame', 'fire'],
    ['kikyo', 'SPIRIT ARROW!', 'beam', 'white'], ['naraku', 'MIASMA!', 'pulse', 'purple'], ['kagura', 'DANCE OF BLADES!', 'slash', 'green'], ['koga', 'WHIRLWIND KICK!', 'rush', 'teal'],
    ['bankotsu', 'BANRYU!', 'slash', 'violet'], ['totosai', 'FORGED BLADE!', 'flame', 'brown'], ['jaken', 'STAFF OF TWO HEADS!', 'flame', 'fire'],
    ['jakotsu', 'JAKOTSUTO!', 'slash', 'pink'], ['kohaku', 'CHAIN SICKLE!', 'slash', 'silver'], ['hakudoshi', 'POISON SWARM!', 'pulse', 'purple'],
  ],
  witcher: [
    ['ciri', 'ELDER BLOOD!', 'pulse', 'teal'], ['eredin-breacc-glas', 'WILD HUNT!', 'slash', 'ice'], ['vesemir', 'SILVER SWORD!', 'slash', 'silver'], ['eskel', 'WOLF STRIKE!', 'slash', 'white'],
    ['triss-merigold', 'FIREBALL!', 'flame', 'fire'], ['regis', 'HIGHER VAMPIRE!', 'pulse', 'crimson'], ['zoltan-chivay', 'DWARVEN AXE!', 'rush', 'brown'],
    ['dandelion', 'POWER CHORD!', 'pulse', 'gold'], ['roach', 'GALLOP!', 'rush', 'brown'], ['lambert', 'QUEN SHIELD!', 'rune', 'gold'], ['keira-metz', 'LIGHTNING BOLT!', 'lightning', 'blue'],
    ['philippa-eilhart', 'OWL STRIKE!', 'pulse', 'violet'], ['avallac-h', 'ELVEN PORTAL!', 'rune', 'violet'], ['cahir', 'NILFGAARD CHARGE!', 'rush', 'dark'],
  ],
  dragonage: [
    ['garrett-hawke', 'BLOOD MAGIC!', 'pulse', 'crimson'], ['cassandra-pentaghast', 'JUSTICE!', 'slash', 'silver'], ['solas', 'FADE STEP!', 'rune', 'green'],
    ['cullen-rutherford', 'TEMPLAR SMITE!', 'pulse', 'silver'], ['alistair-theirin', 'SHIELD BASH!', 'rush', 'silver'], ['iron-bull', 'BULL RUSH!', 'rush', 'brown'],
    ['leliana', 'SPYMASTER\'S ARROW!', 'beam', 'red'], ['morrigan', 'SPIRIT BLAST!', 'sphere', 'violet'], ['dorian-pavus', 'FIREBALL!', 'flame', 'fire'],
    ['varric-tethras', 'BIANCA!', 'beam', 'gold'], ['flemeth', 'DRAGON FORM!', 'flame', 'red'], ['anders', 'JUSTICE\'S WRATH!', 'lightning', 'blue'],
    ['fenris', 'LYRIUM SMASH!', 'slash', 'teal'], ['isabela', 'PIRATE\'S TRICK!', 'slash', 'pink'], ['blackwall', 'GREY WARDEN!', 'rush', 'silver'], ['sera', 'ARROW OF PRANKS!', 'beam', 'lime'],
  ],
  dota: [
    ['anti-mage', 'MANA VOID!', 'pulse', 'blue'], ['shadow-fiend', 'REQUIEM OF SOULS!', 'pulse', 'dark'], ['storm-spirit', 'BALL LIGHTNING!', 'lightning', 'blue'],
    ['io', 'OVERCHARGE!', 'sphere', 'teal'], ['sniper', 'ASSASSINATE!', 'beam', 'silver'], ['pudge', 'MEAT HOOK!', 'slash', 'crimson'], ['crystal-maiden', 'FREEZING FIELD!', 'pulse', 'ice'],
    ['earthshaker', 'ECHO SLAM!', 'pulse', 'brown'], ['axe', 'BERSERKER\'S CALL!', 'rush', 'red'], ['sven', 'GOD\'S STRENGTH!', 'rush', 'gold'], ['tinker', 'LASER!', 'beam', 'red'],
    ['phantom-assassin', 'COUP DE GRACE!', 'slash', 'violet'],
  ],
  poe: [
    ['the-duelist', 'DOUBLE STRIKE!', 'slash', 'silver'], ['the-shadow', 'LETHAL STRIKE!', 'slash', 'dark'], ['atziri', 'FLAMEBLAST!', 'flame', 'red'],
    ['the-scion', 'SPECTRAL THROW!', 'slash', 'violet'], ['the-templar', 'SMITE!', 'lightning', 'gold'], ['the-marauder', 'EARTHQUAKE!', 'pulse', 'brown'],
    ['zana', 'MAP MASTER!', 'rune', 'gold'], ['the-ranger', 'TORNADO SHOT!', 'beam', 'green'], ['the-witch', 'FIREBALL!', 'flame', 'fire'], ['einhar', 'BEAST HUNT!', 'rush', 'brown'],
    ['shaper-of-realms', 'SHAPER BEAM!', 'beam', 'violet'], ['kitava', 'TIDE OF HUNGER!', 'pulse', 'crimson'], ['sirus', 'DIE BEAM!', 'beam', 'white'],
    ['niko', 'VOLATILE BLAST!', 'pulse', 'teal'], ['alva', 'TEMPLE RUSH!', 'rush', 'gold'], ['maven', 'MEMORY GAME!', 'rune', 'purple'],
  ],
  finalfantasy: [
    ['auron', 'OVERDRIVE: DRAGON FANG!', 'slash', 'red'], ['tidus', 'SLICE AND DICE!', 'slash', 'teal'], ['lightning', 'RING OF FIRE!', 'flame', 'fire'],
    ['tifa-lockhart', 'FINAL HEAVEN!', 'rush', 'gold'], ['aerith-gainsborough', 'HOLY!', 'rune', 'white'], ['lulu', 'FIRAGA!', 'flame', 'fire'], ['vivi-ornitier', 'FLARE!', 'sphere', 'fire'],
    ['barret-wallace', 'BIG SHOT!', 'beam', 'red'], ['zidane-tribal', 'TRANCE: GRAND LETHAL!', 'slash', 'gold'], ['noctis-lucis-caelum', 'WARP STRIKE!', 'slash', 'violet'],
    ['terra-branford', 'TRANCE FORM!', 'pulse', 'green'], ['kefka-palazzo', 'LIGHT OF JUDGMENT!', 'beam', 'white'], ['yuna', 'GRAND SUMMON!', 'rune', 'pink'],
  ],
  elderscrolls: [
    ['ulfric-stormcloak', 'THUNDER VOICE!', 'pulse', 'blue'], ['tiber-septim', 'DRAGONBORN EMPEROR!', 'rune', 'gold'], ['serana', 'VAMPIRIC DRAIN!', 'pulse', 'crimson'],
    ['miraak', 'DRAGON ASPECT!', 'pulse', 'dark'], ['lydia', 'SHIELD CHARGE!', 'rush', 'silver'], ['brynjolf', 'SNEAK ATTACK!', 'slash', 'dark'], ['paarthurnax', 'YOL TOOR SHUL!', 'flame', 'fire'],
    ['cicero', 'DARK BROTHERHOOD!', 'slash', 'crimson'], ['j-zargo', 'FIREBALL!', 'flame', 'fire'], ['farkas', 'WEREWOLF RUSH!', 'rush', 'brown'], ['vilkas', 'COMPANION\'S BLADE!', 'slash', 'silver'],
    ['aela-the-huntress', 'HUNTER\'S ARROW!', 'beam', 'brown'], ['esbern', 'BLADES\' LORE!', 'rune', 'gold'], ['mercer-frey', 'GLOVE OF NIGHTINGALE!', 'slash', 'violet'],
  ],
  assassinscreed: [
    ['altair-ibn-la-ahad', 'LEAP OF FAITH!', 'slash', 'white'], ['ezio-auditore', 'REQUIESCAT IN PACE!', 'slash', 'red'], ['bayek-of-siwa', 'MEDJAY\'S WRATH!', 'slash', 'gold'],
    ['kassandra', 'SPARTAN KICK!', 'rush', 'gold'], ['eivor', 'RAVEN\'S STRIKE!', 'slash', 'ice'], ['edward-kenway', 'PIRATE\'S CUTLASS!', 'slash', 'teal'],
    ['aveline-de-grandpre', 'PARKOUR STRIKE!', 'rush', 'brown'], ['connor-kenway', 'TOMAHAWK THROW!', 'slash', 'green'], ['shay-cormac', 'TEMPLAR HUNT!', 'slash', 'crimson'],
    ['evie-frye', 'ROPE DART!', 'slash', 'pink'], ['leonardo-da-vinci', 'FLYING MACHINE!', 'rune', 'gold'], ['arno-dorian', 'PHANTOM BLADE!', 'slash', 'violet'],
    ['haytham-kenway', 'GRAND MASTER!', 'rune', 'dark'], ['jacob-frye', 'KNUCKLE BLADE!', 'rush', 'brown'], ['basim-ibn-ishaq', 'ODIN\'S SIGHT!', 'pulse', 'violet'],
    ['desmond-miles', 'EAGLE VISION!', 'pulse', 'blue'],
  ],
}

export const PLAYER_MOVES: Record<string, Move> = Object.fromEntries(
  Object.entries(TEAMS).flatMap(([team, rows]) => rows.map(([who, name, style, pal]): [string, Move] => [`${team}-${who}`, { name, style, c1: PAL[pal][0], c2: PAL[pal][1] }])),
)
