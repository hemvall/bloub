<script setup lang="ts">
import { useTemplateRef } from 'vue'
import FondPicker from '@/components/FondPicker.vue'
import { t } from '@/i18n'
import { type FondGif } from '@/ui/export'
import { useModalDialog } from '@/ui/useModalDialog'

/**
 * Choix du fond avant de telecharger le GIF.
 *
 * Ce format est le seul a poser la question : sa transparence n'a qu'un bit, donc
 * son bord transparent est dur et se voit. Le fond plein le lisse, en echange
 * d'une couleur cuite dans l'image — aucun des deux ne gagne dans tous les cas,
 * d'ou le choix laisse a l'utilisateur. Et la couleur cuite se choisit, sans quoi
 * « lisser le bord » voudrait dire « poser une carte blanche » sur les avatars
 * sombres de Discord ou de Slack, qui sont justement la raison d'etre du GIF.
 *
 * Le selecteur lui-meme vit dans `FondPicker` : la boite du montage pose la meme
 * question, et une question posee deux fois doit avoir une seule reponse.
 * Le comportement modal vient de `useModalDialog`, l'animation de `styles.css`.
 */
const open = defineModel<boolean>('open', { required: true })
const fond = defineModel<FondGif>('fond', { required: true })
const emit = defineEmits<{ confirm: [] }>()

const boite = useTemplateRef<HTMLDialogElement>('boite')
useModalDialog(open, boite)

function confirm() {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <dialog
    ref="boite"
    class="dialogue m-auto w-80 rounded-2xl bg-white p-5 text-[var(--ink)] shadow-xl"
    :aria-label="t('export.gifTitle')"
    @close="open = false"
    @cancel.prevent="open = false"
  >
    <form class="flex flex-col gap-4" @submit.prevent="confirm">
      <div class="flex flex-col gap-1">
        <h2 class="text-sm font-semibold">{{ t('export.gifTitle') }}</h2>
        <p class="text-xs text-[var(--muted)]">{{ t('export.gifDetail') }}</p>
      </div>

      <FondPicker v-model="fond" name="fond" />

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="h-8 cursor-pointer rounded-lg px-3 text-xs text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
          @click="open = false"
        >
          {{ t('dialog.cancel') }}
        </button>
        <button
          type="submit"
          class="h-8 cursor-pointer rounded-lg bg-[var(--ink)] px-3 text-xs text-[var(--paper)] transition hover:opacity-90 active:scale-95"
        >
          {{ t('export.gifConfirm') }}
        </button>
      </div>
    </form>
  </dialog>
</template>
