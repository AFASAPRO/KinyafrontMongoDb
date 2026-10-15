import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
const app = createApp(App)
app.directive('reveal', { mounted(el) {
  el.classList.add('rv')
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { threshold: .3 })
  io.observe(el)
} })
app.mount('#app')
