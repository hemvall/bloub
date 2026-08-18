import { describe, expect, it } from 'vitest'
import { COLORS, resoudreCouleur } from './skins'
import { DEGRADE, degradeDuCorps, estHex, normaliseHex, versHex, versTsl } from './texture'

/**
 * Le degrade du corps, mesure contre le rendu de reference.
 *
 * Ce fichier verrouille surtout UNE chose : que la couleur choisie ressorte telle
 * quelle au milieu de la rampe. C'est ce qui fait qu'une teinte saisie a la main
 * reste reconnaissable, et que `mandarine` rend le rendu de reference et pas une
 * approximation qui lui ressemble.
 */

describe('lecture des hex', () => {
  it('accepte les deux ecritures et normalise', () => {
    expect(normaliseHex('#f80')).toBe('#ff8800')
    expect(normaliseHex('#FF8B00')).toBe('#ff8b00')
    expect(normaliseHex('  #ff8b00  ')).toBe('#ff8b00')
  })

  it('refuse tout le reste', () => {
    for (const mauvais of ['ff8b00', '#ff8b0', '#gg0000', '', '#', 'rouge', '#ff8b0000']) {
      expect(estHex(mauvais)).toBe(false)
      expect(normaliseHex(mauvais)).toBeNull()
    }
  })

  it('fait l aller-retour TSL sans deriver', () => {
    for (const c of COLORS) {
      const [t, s, l] = versTsl(c.hex)
      expect(versHex(t, s, l)).toBe(c.hex)
    }
  })
})

describe('rampe du corps', () => {
  /**
   * Les trois arrets releves sur le rendu de reference. Ce sont eux qui ont
   * produit les ecarts TSL de `texture.ts` : le test les reprend a l'endroit, donc
   * il tombe des qu'un ecart est retouche.
   */
  it('rend le rendu de reference sur son orange', () => {
    expect(degradeDuCorps('#ff8b00').map((a) => a.couleur)).toEqual([
      '#f3d25d',
      '#ff8b00',
      '#c03a00'
    ])
  })

  it('pose la couleur choisie EXACTEMENT au milieu', () => {
    for (const c of COLORS) {
      const arrets = degradeDuCorps(c.hex)
      expect(arrets[1]!.couleur).toBe(c.hex)
      expect(arrets[1]!.offset).toBe(DEGRADE.milieu)
    }
    expect(degradeDuCorps('#123456')[1]!.couleur).toBe('#123456')
    // ecriture courte comprise, et normalisee au passage
    expect(degradeDuCorps('#1af')[1]!.couleur).toBe('#11aaff')
  })

  it('eclaircit toujours vers le haut de la rampe', () => {
    for (const c of [...COLORS.map((c) => c.hex), '#123456', '#ffffff', '#000000', '#808080']) {
      const [clair, base, sombre] = degradeDuCorps(c).map((a) => versTsl(a.couleur)[2])
      expect(clair!).toBeGreaterThanOrEqual(base!)
      expect(base!).toBeGreaterThanOrEqual(sombre!)
    }
  })

  /**
   * Le reflet tourne vers le JAUNE, pas d'un signe fixe. Un bleu dont le reflet
   * partirait dans l'autre sens virerait au violet, ce qui se lit comme une faute
   * de couleur et non comme une lumiere.
   */
  it('tourne le reflet vers le jaune quelle que soit la teinte', () => {
    const versJaune = (teinte: number) => Math.abs(((60 - teinte + 540) % 360) - 180)
    // Un tour d'horizon vif et a mi-lumiere : c'est la que la regle se lit. La
    // palette, elle, contient des extremes voulus (encre, creme) dont la rampe
    // bute sur le noir ou le blanc, qui n'ont pas de teinte a orienter.
    for (const teinte of [0, 30, 90, 150, 195, 225, 300, 340]) {
      const base = versHex(teinte, 80, 50)
      const clair = versTsl(degradeDuCorps(base)[0]!.couleur)[0]
      const sombre = versTsl(degradeDuCorps(base)[2]!.couleur)[0]
      expect(versJaune(clair)).toBeLessThan(versJaune(teinte))
      expect(versJaune(sombre)).toBeGreaterThan(versJaune(teinte))
    }
  })

  /**
   * Les deux poles n'ont pas d'arc a suivre : le jaune franc EST la teinte de
   * reference, et son oppose (240deg) en est a exactement 180deg, donc les deux
   * sens s'y valent. La rampe doit quand meme s'ouvrir — sans direction imposee,
   * ses extremites tomberaient sur la meme teinte et le corps redeviendrait plat.
   */
  it('garde du relief sur les deux poles, qui n ont pas d arc a suivre', () => {
    for (const pole of [60, 240]) {
      const teintes = degradeDuCorps(versHex(pole, 80, 50)).map((a) => versTsl(a.couleur)[0])
      expect(new Set(teintes).size).toBe(3)
    }
  })

  it('borne la rampe au lieu de deplacer la couleur choisie', () => {
    // l'encre est trop sombre pour porter son ombre : elle est rognee a zero,
    // et c'est le milieu qui doit rester intact
    const encre = degradeDuCorps('#0a0a0c')
    expect(encre[1]!.couleur).toBe('#0a0a0c')
    expect(encre[2]!.couleur).toBe('#000000')
    // la creme fait l'inverse, en butant sur le blanc
    const creme = degradeDuCorps('#f1efe9')
    expect(creme[1]!.couleur).toBe('#f1efe9')
    expect(creme[0]!.couleur).toBe('#ffffff')
  })
})

describe('resolution de la couleur', () => {
  it('accepte un identifiant de palette comme un hex libre', () => {
    expect(resoudreCouleur('mandarine')).toBe('#ff8b00')
    expect(resoudreCouleur('#1AF')).toBe('#11aaff')
    expect(resoudreCouleur('#123456')).toBe('#123456')
  })

  it('retombe sur la couleur par defaut plutot que de jeter', () => {
    expect(resoudreCouleur('inconnue')).toBe('#0a0a0c')
    expect(resoudreCouleur('')).toBe('#0a0a0c')
    expect(resoudreCouleur(undefined)).toBe('#0a0a0c')
  })
})
