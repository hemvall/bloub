// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import FondPicker from './FondPicker.vue'
import { BLANC, FOND_TRANSPARENT } from '@/ui/export'

/**
 * Le selecteur de fond porte deux pieges, et aucun des deux ne se voit dans
 * `export.ts` : ils tiennent au fait qu'un SEUL champ transporte le mode et la
 * couleur. C'est le prix de ce champ unique, et c'est un bon prix — mais il se
 * paie ici.
 *
 * Un fichier de plus a demander le DOM, donc, et il le dit sur sa premiere ligne
 * comme `capture.test.ts` : le reste de la suite tourne en `node` et doit y rester.
 */
function monte(depart: string, transparence = true) {
  const fond = ref(depart)
  const hote = document.createElement('div')
  document.body.appendChild(hote)
  const app = createApp({
    render: () =>
      h(FondPicker, {
        name: 'test',
        transparence,
        modelValue: fond.value,
        'onUpdate:modelValue': (v: string) => (fond.value = v)
      })
  })
  app.mount(hote)
  return {
    fond,
    hote,
    ferme: () => {
      app.unmount()
      hote.remove()
    }
  }
}

const radio = (hote: HTMLElement, valeur: string) =>
  [...hote.querySelectorAll<HTMLInputElement>('input[type=radio]')].find((r) => r.value === valeur)!

describe('selecteur de fond', () => {
  /*
   * Passer en transparent efface la couleur du champ unique. Sans memoire, revenir
   * sur « plein » reviendrait au blanc et perdrait la teinte qu'on venait de regler.
   */
  it('retrouve la derniere couleur en repassant au plein', async () => {
    const { fond, hote, ferme } = monte('#1a1d21')
    try {
      radio(hote, 'transparent').click()
      await nextTick()
      expect(fond.value).toBe(FOND_TRANSPARENT)

      radio(hote, 'plein').click()
      await nextTick()
      expect(fond.value).toBe('#1a1d21')
    } finally {
      ferme()
    }
  })

  /* En transparent il n'y a pas de couleur a regler : elle disparait, pas grisee. */
  it('ne montre la couleur qu en mode plein', async () => {
    const { hote, ferme } = monte(BLANC)
    try {
      expect(hote.querySelector('input[type=color]')).not.toBeNull()
      radio(hote, 'transparent').click()
      await nextTick()
      expect(hote.querySelector('input[type=color]')).toBeNull()
    } finally {
      ferme()
    }
  })

  /*
   * Un format sans alpha ne doit pas seulement CACHER le transparent, il doit
   * cesser de le PORTER : le montage partage un seul fond entre ses deux formats,
   * donc « transparent » choisi en GIF partait sinon dans l'encodeur video, qui
   * ne sait pas le peindre.
   */
  it('desarme le transparent quand le format n a pas d alpha', () => {
    const { fond, hote, ferme } = monte(FOND_TRANSPARENT, false)
    try {
      expect(fond.value).toBe(BLANC)
      expect(hote.querySelector('input[type=radio]')).toBeNull()
      expect(hote.querySelector('input[type=color]')).not.toBeNull()
    } finally {
      ferme()
    }
  })
})
