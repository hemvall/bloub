import { createApp } from 'vue'
import App from './App.vue'
import SceneStudio from './components/studio/SceneStudio.vue'
import './styles.css'
import './studio.css'

const useStudio = window.location.hash === '#studio' || window.location.pathname === '/studio'
createApp(useStudio ? SceneStudio : App).mount('#app')
