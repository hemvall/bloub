/**
 * Texture du corps : le degrade qui lui donne son volume.
 *
 * Comme le reste de `src/bot/`, c'est une fonction PURE — de la couleur vers des
 * arrets de degrade — sans DOM, sans Vue et sans horloge. Le composant n'en est
 * qu'un client : il pose les arrets dans un `<radialGradient>` et remplit le
 * corps avec.
 *
 * Le degrade ne depend PAS du temps, d'ou son absence de `BotFrame` : recalculer
 * trois couleurs a chaque image pour un resultat identique n'aurait servi qu'a
 * alourdir la boucle. Il est fixe dans le repere, donc il se lit comme une
 * SOURCE DE LUMIERE et non comme un motif colle au corps — c'est ce qui fait
 * qu'il ne tremble pas quand la boule respire et derive.
 *
 * Tout ce qui suit est RELEVE sur le rendu de reference (`docs/betcha.png`,
 * cf. docs/measurements.md), pas choisi. Un ajustement modifie le meme
 * personnage.
 */

/**
 * Geometrie du degrade, en unites de RAYON de boule.
 *
 * Le centre n'est pas celui du corps : la lumiere vient d'en haut a gauche, et
 * le rayon (1,589) depasse largement la boule parce que le degrade de reference
 * n'atteint sa teinte la plus sombre qu'au COIN le plus eloigne de la silhouette,
 * pas sur son bord le plus proche.
 */
export const DEGRADE = {
  /** Centre de la lumiere, releve a -0,331 / -0,397 rayon du centre du corps. */
  cx: -0.331,
  cy: -0.397,
  /** Distance a laquelle le degrade atteint son arret sombre. */
  rayon: 1.589,
  /**
   * Position de l'arret MEDIAN, celui qui porte la couleur choisie telle quelle.
   *
   * 0,523 et pas 0,5 : sur le rendu de reference la rampe casse a 0,831 rayon du
   * centre de la lumiere, la ou le rouge sature — deux segments lineaires, donc,
   * et pas une seule pente.
   */
  milieu: 0.523
} as const

/**
 * Ecarts en TSL entre la couleur choisie et les deux extremites de la rampe.
 *
 * En teinte-saturation-lumiere et pas en RVB : c'est ce qui permet a la meme
 * mesure de servir a n'importe quelle couleur. Mesures faites sur l'orange de
 * reference (#ff8b00), dont les trois arrets sont #f3d25d, #ff8b00 et #c03a00.
 *
 * La teinte tourne VERS LE JAUNE du cote eclaire et s'en eloigne du cote a
 * l'ombre. Sur l'orange de reference ca donne exactement les +14,09 et -14,58
 * releves ; sur un bleu ca donne un reflet qui tire vers le cyan et une ombre qui
 * s'enfonce dans le violet, ce qui est la meme regle et non une exception —
 * appliquer les signes bruts aurait fait virer le reflet d'un bleu au violet.
 */
const CLAIR = { teinte: 14.09, saturation: -13.79, lumiere: 15.88 }
const SOMBRE = { teinte: -14.58, saturation: 0, lumiere: -12.35 }

/** Teinte de reference vers laquelle le reflet tourne. */
const JAUNE = 60

const clamp01 = (v: number) => Math.max(0, Math.min(100, v))

/** `#f80` et `#ff8800` sont acceptes ; tout le reste rend `null`. */
export function litHex(valeur: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(valeur.trim())
  if (!m) return null
  const c = m[1]!
  const plein = c.length === 3 ? c.replace(/./g, (d) => d + d) : c
  const v = parseInt(plein, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

/** Vrai pour une couleur libre saisie par l'utilisateur. */
export function estHex(valeur: string): boolean {
  return litHex(valeur) !== null
}

/** Ramene `#f80` et `#FF8800` a la meme ecriture, celle que le SVG portera. */
export function normaliseHex(valeur: string): string | null {
  const rvb = litHex(valeur)
  return rvb ? `#${rvb.map((x) => x.toString(16).padStart(2, '0')).join('')}` : null
}

/** RVB 0-255 vers teinte (deg), saturation et lumiere (0-100). */
export function versTsl(hex: string): [number, number, number] {
  const rvb = litHex(hex) ?? [0, 0, 0]
  const [r, v, b] = rvb.map((x) => x / 255) as [number, number, number]
  const max = Math.max(r, v, b)
  const min = Math.min(r, v, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l * 100]
  const s = d / (1 - Math.abs(2 * l - 1))
  let t: number
  if (max === r) t = ((v - b) / d) % 6
  else if (max === v) t = (b - r) / d + 2
  else t = (r - v) / d + 4
  return [((t * 60) % 360 + 360) % 360, s * 100, l * 100]
}

/** Teinte-saturation-lumiere vers `#rrggbb`. */
export function versHex(teinte: number, saturation: number, lumiere: number): string {
  const t = ((teinte % 360) + 360) % 360
  const s = clamp01(saturation) / 100
  const l = clamp01(lumiere) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((t / 60) % 2) - 1))
  const m = l - c / 2
  const [r, v, b] = (
    t < 60
      ? [c, x, 0]
      : t < 120
        ? [x, c, 0]
        : t < 180
          ? [0, c, x]
          : t < 240
            ? [0, x, c]
            : t < 300
              ? [x, 0, c]
              : [c, 0, x]
  ) as [number, number, number]
  return `#${[r, v, b]
    .map((n) => Math.round((n + m) * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * Sens de rotation vers le jaune, en arc le plus court.
 *
 * Le `|| 1` n'est pas de la superstition : une teinte exactement opposee au jaune
 * (240deg, le bleu franc) donne un arc de -180, dont le signe est bien defini,
 * mais une teinte EGALE au jaune donne 0 — et sans direction le reflet et l'ombre
 * tomberaient sur la meme teinte, donc sur une rampe sans relief.
 */
function versLeJaune(teinte: number): number {
  const arc = (((JAUNE - teinte + 540) % 360) - 180)
  return Math.sign(arc) || 1
}

export interface ArretDegrade {
  /** Position sur la rampe, de 0 (coeur de la lumiere) a 1 (bord a l'ombre). */
  offset: number
  couleur: string
}

/**
 * Les trois arrets du corps pour une couleur donnee.
 *
 * L'arret median porte la couleur EXACTEMENT telle qu'elle a ete choisie : c'est
 * ce qui fait qu'un `#ff8b00` rend le rendu de reference au pixel, et qu'une
 * couleur libre reste reconnaissable comme celle qu'on a saisie.
 *
 * Les bornes de `versHex` rognent la rampe sur les couleurs extremes plutot que
 * de la deplacer : l'encre (lumiere 4 %) garde donc un reflet et perd son ombre,
 * la creme fait l'inverse. Recentrer la rampe aurait sauve le relief au prix de
 * la couleur choisie, qui n'aurait plus ete celle affichee.
 */
export function degradeDuCorps(hex: string): ArretDegrade[] {
  const [t, s, l] = versTsl(normaliseHex(hex) ?? '#000000')
  const sens = versLeJaune(t)
  return [
    {
      offset: 0,
      couleur: versHex(t + sens * CLAIR.teinte, s + CLAIR.saturation, l + CLAIR.lumiere)
    },
    { offset: DEGRADE.milieu, couleur: normaliseHex(hex) ?? '#000000' },
    {
      offset: 1,
      couleur: versHex(t + sens * SOMBRE.teinte, s + SOMBRE.saturation, l + SOMBRE.lumiere)
    }
  ]
}
