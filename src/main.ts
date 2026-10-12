import { createApp } from 'vue'
import './styles.css'
import './studio.css'

const useStudio = window.location.hash === '#studio' || window.location.pathname === '/studio'
if (useStudio) document.title = 'Bloub · Scene Studio'
const { default: App } = await (useStudio
  ? import('./components/studio/SceneStudio.vue')
  : import('./App.vue'))
createApp(App).mount('#app')
