import { PROFILE_SAMPLES } from './profiles'
import { estHex, normaliseHex } from './texture'
import {
  hullOfCircles,
  profileFromPolygon,
  regularPolygonProfile,
  superellipseProfile,
  unionOfCirclesProfile,
  unionOfEllipsesProfile
} from './shape'

/**
 * Formes et couleurs proposees par le personnalisateur du bot.
 *
 * A la difference des silhouettes d'animation (`profiles.ts`), celles-ci ne sont
 * PAS relevees sur la video : elles sont construites analytiquement d'apres la
 * grille du personnalisateur d'origine. Deux sources distinctes, donc, et c'est
 * volontaire — les etats animes doivent rester fideles a la video, les formes de
 * base sont un choix d'utilisateur.
 */

/**
 * Les identifiants sont enumeres plutot que deduits du tableau : c'est ce qui
 * permet a la couche i18n de verifier A LA COMPILATION que chaque forme a bien
 * sa traduction dans les trois langues (`t(\`shapes.${id}\`)` ne compile que si
 * la cle existe). Un `as const` sur le tableau aurait le meme effet mais
 * rendrait `radii` en lecture seule, alors que le moteur le passe tel quel.
 */
export type ShapeId =
  | 'cercle'
  | 'galet'
  | 'squircle'
  | 'capsule'
  | 'triangle'
  | 'hexagone'
  | 'nuage'
  | 'goutte'
  | 'zh'

export interface BotShape {
  id: ShapeId
  radii: number[]
}

/** Ramene le rayon maximal a `max` pour que toutes les formes pesent pareil a l'oeil. */
function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * Math.PI * 2)

/** Galet : cercle deforme par deux harmoniques basses, donc irregulier mais lisse. */
const pebble = normalize(
  ANGLES.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)),
  1.02
)

/** Nuage : union de bosses, large en bas, deux lobes en haut. */
const cloud = normalize(
  unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 }
  ]),
  1.02
)

/** Goutte : gros disque en bas, pointe effilee en haut. */
const droplet = normalize(
  profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0),
  1.04
)

/** Capsule couchee : enveloppe de deux disques cote a cote. */
const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0)

/**
 * Zh : une tete ronde et deux bras lateraux, legerement sous l'equateur et
 * inclines en sens inverse l'un de l'autre.
 *
 * Reprise d'un avatar construit ailleurs — `bible-strong-avatar-lab`, entree
 * `avatar-b6362e59-81a3-4334-a399-a721b23cf553` de `defaultStudioDocument.json` —
 * d'ou les nombres a rallonge : ce sont ses valeurs telles quelles, simplement
 * divisees par 120 (la moitie des 240 unites de large de son corps) pour passer en
 * rayons de boule. Les arrondir ferait deriver la ressemblance sans rien
 * simplifier, puisque personne ne les lit.
 *
 * Des ELLIPSES et pas des disques : les bras sont plus larges (108,1) que hauts
 * (81,6), et un disque ne sait pas dire ca. C'est la seule forme du
 * personnalisateur qui en a besoin.
 */
const UNITE_LABO = 120
const bras = { a: 108.11015625 / 2 / UNITE_LABO, b: 81.6 / 2 / UNITE_LABO }
const zh = normalize(
  unionOfEllipsesProfile([
    { x: 0, y: 0, a: 1, b: 1 },
    { x: -103.30437876033604 / UNITE_LABO, y: 30.4449714479682 / UNITE_LABO, ...bras, rot: -14.843359375 },
    { x: 98.15429266544173 / UNITE_LABO, y: 32.55003025735345 / UNITE_LABO, ...bras, rot: 15.175 }
  ]),
  // 1.15 pour la meme raison que le squircle, et le chiffre est le meme expres :
  // le rayon maximal est ici le BOUT D'UN BRAS, une protuberance mince, donc
  // normaliser dessus rapetisserait la tete jusqu'a 0,76 rayon. A 1,15 elle tient
  // 0,853 et la forme pese 0,899 en rayon equivalent, soit la bande ou vivent
  // deja le nuage et le galet.
  //
  // Et surtout 1,15 est DEJA le maximum de la palette : `RAYON_MAX` ne bouge donc
  // pas, et le cadre d'export — qui est commun a toutes les formes — non plus.
  // Viser la taille de tete « juste » (1,311) l'aurait elargi de 14 %, ce qui
  // aurait rapetissé l'export de toutes les autres formes.
  1.15
)

export const SHAPES: BotShape[] = [
  { id: 'cercle', radii: new Array(PROFILE_SAMPLES).fill(1) },
  { id: 'galet', radii: pebble },
  // 1.15 et pas 1.02 : sur une superellipse le rayon maximal est la diagonale,
  // donc normaliser dessus donne une forme qui parait plus petite que le cercle.
  { id: 'squircle', radii: normalize(superellipseProfile(4.2), 1.15) },
  { id: 'capsule', radii: capsule },
  // -90deg : un sommet vers le haut de l'ecran (y est oriente vers le bas)
  { id: 'triangle', radii: regularPolygonProfile(3, 1.12, 0.34, -90) },
  // 0deg : sommets a gauche et a droite, donc aretes du haut et du bas plates
  { id: 'hexagone', radii: regularPolygonProfile(6, 1.04, 0.26, 0) },
  { id: 'nuage', radii: cloud },
  { id: 'goutte', radii: droplet },
  { id: 'zh', radii: zh }
]

// Map indexee par `string` et non par `ShapeId` : les appelants interrogent avec
// une valeur relue du localStorage ou d'une prop, donc non validee.
export const SHAPE_BY_ID = new Map<string, BotShape>(SHAPES.map((s) => [s.id, s]))
export const DEFAULT_SHAPE = 'cercle'

export type ColorId =
  | 'encre'
  | 'creme'
  | 'brun'
  | 'rouge'
  | 'orange'
  | 'mandarine'
  | 'ambre'
  | 'vert'
  | 'turquoise'
  | 'bleu'
  | 'violet'
  | 'rose'
  | 'gris'

export interface BotColor {
  id: ColorId
  hex: string
}

/** Palette du personnalisateur d'origine. */
export const COLORS: BotColor[] = [
  { id: 'encre', hex: '#0a0a0c' },
  { id: 'brun', hex: '#8b5e3c' },
  { id: 'rouge', hex: '#e8483f' },
  { id: 'orange', hex: '#f08a24' },
  // Mandarine est l'orange du RENDU DE REFERENCE, celui sur lequel le degrade du
  // corps a ete releve (docs/measurements.md). C'est la seule couleur de la
  // palette qui soit une mesure et non un choix : la poser rend ce rendu-la, ses
  // trois arrets compris. Ne pas l'arrondir a #ff8c00, la teinte tomberait a cote.
  { id: 'mandarine', hex: '#ff8b00' },
  { id: 'ambre', hex: '#f0b429' },
  { id: 'vert', hex: '#3ecf8e' },
  { id: 'turquoise', hex: '#2fbfa0' },
  { id: 'bleu', hex: '#3b93f0' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'rose', hex: '#e152b0' },
  { id: 'gris', hex: '#a3a3a3' },
  { id: 'creme', hex: '#f1efe9' }
]

export const COLOR_BY_ID = new Map<string, BotColor>(COLORS.map((c) => [c.id, c]))
export const DEFAULT_COLOR = 'encre'

/**
 * Couleur du corps, depuis ce que porte la prop ou le stockage.
 *
 * Une couleur est SOIT un identifiant de la palette, SOIT un hex libre : le
 * personnalisateur laisse saisir n'importe quelle teinte, et il fallait bien la
 * transporter quelque part. Le meme champ sert aux deux plutot qu'un second
 * reglage « couleur personnalisee » a tenir synchronise avec le premier — les
 * identifiants de la palette ne commencent pas par `#`, les deux ensembles ne
 * peuvent donc pas se croiser.
 *
 * Rend toujours un hex normalise : le SVG exporte doit etre auto-porteur, donc
 * aucune couleur n'y transite sous forme d'identifiant.
 */
export function resoudreCouleur(valeur: string | undefined): string {
  if (!valeur) return COLOR_BY_ID.get(DEFAULT_COLOR)!.hex
  const connue = COLOR_BY_ID.get(valeur)
  if (connue) return connue.hex
  return normaliseHex(valeur) ?? COLOR_BY_ID.get(DEFAULT_COLOR)!.hex
}

/** Une valeur relue du stockage ou d'une URL est-elle utilisable telle quelle ? */
export function estCouleurValide(valeur: string): boolean {
  return COLOR_BY_ID.has(valeur) || estHex(valeur)
}

/** Melange deux couleurs hex. Sert a la brume de profondeur des particules. */
export function mixHex(from: string, to: string, t: number): string {
  const parse = (h: string) => {
    const v = parseInt(h.slice(1), 16)
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  }
  const a = parse(from)
  const b = parse(to)
  const c = a.map((x, i) => Math.round(x + (b[i]! - x) * t))
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`
}
