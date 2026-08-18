<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { estHex, normaliseHex } from '@/bot/texture'
import { t } from '@/i18n'
import {
  BLANC,
  FOND_TRANSPARENT,
  MODES_FOND,
  couleurDeFond,
  estFondTransparent,
  modeDuFond,
  type FondGif,
  type ModeFond
} from '@/ui/export'

/**
 * Choix du fond d'un export : transparent, ou une couleur.
 *
 * Partage par les deux boites qui le demandent — l'avatar en GIF et le montage —
 * parce que c'est la meme question et qu'elle a la meme reponse. La ou les deux
 * different, c'est sur ce qu'elles ont le droit d'offrir : la video n'a pas
 * d'alpha du tout, donc `transparence` retire le mode et ne laisse que la
 * couleur.
 *
 * Le nuancier natif fait le gros du travail — il apporte la roue chromatique du
 * systeme, y compris la pipette la ou elle existe — et le champ texte est la pour
 * COLLER un hex. C'est exactement le couple du personnalisateur, meme idiome.
 */
const props = withDefaults(
  defineProps<{
    /** Nom du groupe de radios : deux boites ne doivent pas se croiser. */
    name: string
    /** Le format sait-il etre transparent ? Faux pour une video. */
    transparence?: boolean
    /** Afficher la ligne d'aide sous chaque mode. */
    aide?: boolean
    disabled?: boolean
  }>(),
  { transparence: true, aide: true, disabled: false }
)

const fond = defineModel<FondGif>({ required: true })

/**
 * La derniere couleur choisie, gardee ici et non dans le modele.
 *
 * Passer en transparent efface la couleur du champ unique : sans cette memoire,
 * revenir sur « plein » reviendrait au blanc et perdrait la teinte qu'on venait
 * de regler. C'est un souvenir d'interface, pas un reglage — d'ou sa place dans
 * le composant plutot qu'un second champ a tenir synchronise avec le premier.
 */
const dernierHex = ref(couleurDeFond(fond.value) ?? BLANC)
watch(fond, (valeur) => {
  const hex = couleurDeFond(valeur)
  if (hex) dernierHex.value = hex
})

/*
 * Un format sans alpha ne doit pas seulement CACHER le transparent, il doit
 * cesser de le porter : le montage partage un seul fond entre ses deux formats,
 * donc choisir « transparent » en GIF puis basculer en MP4 laissait la video
 * partir sur une valeur qu'elle ne sait pas peindre.
 */
watch(
  () => [props.transparence, fond.value] as const,
  ([alpha, valeur]) => {
    if (!alpha && estFondTransparent(valeur)) fond.value = dernierHex.value
  },
  { immediate: true }
)

/*
 * Le mode se lit de la valeur, SAUF quand le format n'a pas d'alpha : la
 * correction ci-dessus passe par le modele, donc par le parent, donc par un tour
 * de rendu — le premier affichage aurait montre le mode transparent le temps que
 * la valeur revienne. Le forcer ici fait que l'affichage ne ment jamais, pas meme
 * une image.
 */
const mode = computed<ModeFond>({
  get: () => (props.transparence ? modeDuFond(fond.value) : 'plein'),
  set: (valeur) => (fond.value = valeur === 'transparent' ? FOND_TRANSPARENT : dernierHex.value)
})

/** Ce que le nuancier natif doit afficher, y compris en mode transparent. */
const hexCourant = computed(() => couleurDeFond(fond.value) ?? dernierHex.value)

/**
 * Saisie a la main. On n'ecrit le modele QUE sur un hex complet : sinon, taper
 * « #1a1d21 » caractere par caractere ferait passer le fond par toutes les
 * couleurs intermediaires que les prefixes decrivent.
 */
function saisie(event: Event) {
  const brut = (event.target as HTMLInputElement).value
  if (estHex(brut)) fond.value = normaliseHex(brut)!
}
</script>

<template>
  <fieldset class="flex flex-col gap-1" :disabled="disabled">
    <legend class="sr-only">{{ t('export.gifBackground') }}</legend>

    <template v-if="transparence">
      <label
        v-for="(choix, i) in MODES_FOND"
        :key="choix"
        class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-black/5"
      >
        <input
          v-model="mode"
          type="radio"
          :name="name"
          :value="choix"
          :autofocus="i === 0"
          class="accent-[var(--ink)]"
        />
        <span class="flex flex-col">
          {{ t(`export.fond_${choix}`) }}
          <span v-if="aide" class="text-xs text-[var(--muted)]">
            {{ t(`export.fond_${choix}_aide`) }}
          </span>
        </span>
      </label>
    </template>

    <!--
      La couleur ne s'affiche qu'en mode plein : grisee, elle proposerait de
      regler quelque chose qui ne sert a rien. Meme regle que le groupe « fond »
      absent pour la video plutot que desactive.
    -->
    <div v-if="mode === 'plein'" class="flex items-center gap-2 px-2 py-1">
      <input
        class="h-8 w-8 shrink-0 cursor-pointer rounded-full bg-transparent p-0"
        type="color"
        :value="hexCourant"
        :aria-label="t('export.fondCouleur')"
        @input="saisie"
      />
      <label class="flex flex-1 items-center gap-2 text-xs text-[var(--muted)]">
        {{ t('export.fondCouleur') }}
        <input
          class="h-8 w-24 rounded-lg bg-black/5 px-2 font-mono text-xs text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
          type="text"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          maxlength="7"
          :value="hexCourant"
          :placeholder="hexCourant"
          @input="saisie"
        />
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
/*
 * Le nuancier natif se dessine dans un pseudo-element, et Chrome comme Firefox y
 * posent une bordure et une marge propres : sans ca, la pastille ronde garde un
 * carre gris autour d'elle. Meme correctif que dans le personnalisateur.
 *
 * Le lisere, lui, n'est pas cosmetique ici : le defaut EST le blanc, donc sans
 * lui la pastille disparait dans le fond blanc de la boite.
 */
input[type='color'] {
  border: 1px solid rgb(0 0 0 / 0.1);
}

input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type='color']::-webkit-color-swatch {
  border: none;
  border-radius: 9999px;
}

input[type='color']::-moz-color-swatch {
  border: none;
  border-radius: 9999px;
}
</style>
