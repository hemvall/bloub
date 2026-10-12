<script setup lang="ts">
const PATHS: Record<string, string> = {
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  start: 'M6 5v14M19 5v14L8 12z',
  end: 'M18 5v14M5 5v14l11-7z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  key: 'M12 3l3 9-3 9-3-9z',
  chat: 'M4 5h16v11H9l-5 4z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  export: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  import: 'M12 15V3M7 8l5-5 5 5M5 21h14',
  video: 'M3 7h13v10H3zM16 10l5-3v10l-5-3',
  image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M16 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  json: 'M8 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3M16 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 8.5 4 8l-1 3 2 1v2l-2 1 1 3 2-.5 1.5 1.5-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z',
  send: 'M4 12l16-8-6 16-3-7z',
  stop: 'M6 6h12v12H6z',
  move: 'M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  scale: 'M4 20V10h10M4 20h10M14 4h6v6M20 4l-7 7',
  character: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21c0-4 3.6-7 8-7s8 3 8 7',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  light: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.5 1 2.5h6c0-1 .3-1.9 1-2.5A6 6 0 0 0 12 3',
  scene: 'M3 6h18v12H3zM3 10h18M8 6v12',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  dup: 'M9 9h11v11H9zM4 15V4h11',
  chevron: 'M9 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  library: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  script: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6',
  film: 'M3 5h18v14H3zM3 9h18M3 15h18M8 5v14M16 5v14',
  wand: 'M4 20l10-10M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  reel: 'M7 4h10v16H7zM7 8h10M7 12h10M7 16h10',
  sound: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 10v4h4l5 4V6L8 10zM16 9l5 6M21 9l-5 6',
  mixing: 'M4 10v4h4l5 4V6L8 10zM16 12h5',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  music: 'M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M19 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0M9 18V5l10-2v13M9 9l10-2'
}
defineProps<{ name: keyof typeof PATHS | string; size?: number }>()
</script>
<template>
  <svg
    class="icon"
    :width="size ?? 14"
    :height="size ?? 14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="PATHS[name] ?? ''" />
  </svg>
</template>
