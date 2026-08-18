<script setup lang="ts">
import { computed } from 'vue'
import BotTile from '@/components/BotTile.vue'
import { EXPRESSIONS } from '@/bot/expressions'
import { COLOR_BY_ID, COLORS, SHAPES, resoudreCouleur } from '@/bot/skins'
import { estHex, normaliseHex } from '@/bot/texture'
import { t } from '@/i18n'

const shape = defineModel<string>('shape', { required: true })
const color = defineModel<string>('color', { required: true })
const expression = defineModel<string>('expression', { required: true })

/**
 * Les vignettes sont figees a la meme date que la pose de repos : elles montrent
 * la forme et le visage tels qu'ils apparaitront, pas un aplat abstrait.
 */
const PREVIEW_AT = 1

/**
 * Une couleur LIBRE est-elle en cours ? C'est la seule chose qui distingue les
 * deux moities du selecteur, et elle se deduit de la valeur plutot que d'un
 * drapeau a tenir : un identifiant de la palette n'est jamais un hex.
 */
const libre = computed(() => !COLOR_BY_ID.has(color.value))

/** Ce que le nuancier natif doit afficher, y compris quand la palette est active. */
const hexCourant = computed(() => resoudreCouleur(color.value))

/**
 * Saisie a la main. On n'ecrit le modele QUE sur un hex complet : sinon, taper
 * « #ff8b00 » caractere par caractere ferait passer le bot par toutes les
 * couleurs intermediaires que les prefixes decrivent — `#ff8` est un hex court
 * valide, et le corps aurait clignote en jaune au milieu de la frappe.
 */
function saisie(event: Event) {
  const brut = (event.target as HTMLInputElement).value
  if (estHex(brut)) color.value = normaliseHex(brut)!
}
</script>

<template>
  <div>
    <h2 class="text-sm font-semibold">{{ t('panel.shape') }}</h2>
    <div class="mt-2 grid grid-cols-4 gap-1.5">
      <BotTile
        v-for="s in SHAPES"
        :key="s.id"
        :label="t(`shapes.${s.id}`)"
        :selected="s.id === shape"
        :shape="s.id"
        :color="color"
        :expression="expression"
        :frozen-at="PREVIEW_AT"
        @click="shape = s.id"
      />
    </div>

    <h2 class="mt-5 text-sm font-semibold">{{ t('panel.expression') }}</h2>
    <div class="mt-2 grid grid-cols-4 gap-1.5">
      <BotTile
        v-for="e in EXPRESSIONS"
        :key="e.id"
        :label="t(`expressions.${e.id}`)"
        :selected="e.id === expression"
        :shape="shape"
        :color="color"
        :expression="e.id"
        :frozen-at="PREVIEW_AT"
        @click="expression = e.id"
      />
    </div>

    <h2 class="mt-5 text-sm font-semibold">{{ t('panel.color') }}</h2>
    <!--
      Quatre colonnes et pas six : les pastilles portent desormais leur nom, comme
      les vignettes de forme et d'expression. Une couleur n'est pas devinable a
      l'oeil — « ambre » et « mandarine » sont deux oranges — et l'etiquette etait
      jusqu'ici reservee aux lecteurs d'ecran, qui n'en avaient pas plus besoin
      que les autres.
    -->
    <div class="mt-2 grid grid-cols-4 gap-1.5">
      <button
        v-for="c in COLORS"
        :key="c.id"
        type="button"
        class="flex cursor-pointer flex-col items-center rounded-xl border-2 p-1 transition"
        :class="
          c.id === color ? 'border-[var(--ink)]' : 'border-transparent hover:border-[var(--line)]'
        "
        :aria-pressed="c.id === color"
        @click="color = c.id"
      >
        <!-- liseré interne : sinon la pastille creme disparait sur fond clair -->
        <span
          class="block aspect-square w-[60%] rounded-full ring-1 ring-black/10 ring-inset"
          :style="{ background: c.hex }"
        />
        <!-- 12 px : en dessous, une legende n'est plus lisible pour tout le monde -->
        <span class="text-center text-xs leading-tight text-[var(--muted)]">
          {{ t(`colors.${c.id}`) }}
        </span>
      </button>
    </div>

    <!--
      Couleur libre. Le nuancier natif fait le gros du travail — il apporte la roue
      chromatique du systeme, y compris la pipette la ou elle existe — et le champ
      texte est la pour COLLER un hex, ce que le nuancier ne permet pas partout.
    -->
    <div
      class="mt-2 flex items-center gap-2 rounded-xl border-2 p-1.5 transition"
      :class="libre ? 'border-[var(--ink)]' : 'border-transparent'"
    >
      <input
        class="h-8 w-8 shrink-0 cursor-pointer rounded-full bg-transparent p-0"
        type="color"
        :value="hexCourant"
        :aria-label="t('panel.customColor')"
        @input="saisie"
      />
      <label class="flex flex-1 items-center gap-2 text-xs text-[var(--muted)]">
        {{ t('panel.customColor') }}
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
  </div>
</template>

<style scoped>
/*
 * Le nuancier natif se dessine dans un pseudo-element, et Chrome comme Firefox y
 * posent une bordure et une marge propres : sans ca, la pastille ronde garde un
 * carre gris autour d'elle et ne ressemble plus aux douze autres.
 */
input[type='color'] {
  border: 1px solid rgb(0 0 0 / 0.1);
}
input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type='color']::-webkit-color-swatch,
input[type='color']::-moz-color-swatch {
  border: none;
  border-radius: 9999px;
}
</style>
