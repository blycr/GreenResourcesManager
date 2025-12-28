import { createApp } from 'vue'
import App from './App.vue'
import './main.scss'
import { createAppRouter } from './router'
import { pinia } from './stores'

async function initApp() {
  const router = await createAppRouter()
  const app = createApp(App)
  
  app.use(pinia)
  app.use(router)
  app.mount('#app')
}

initApp().catch(console.error)
