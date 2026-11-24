import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import HomeSections from './components/HomeSections.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomeSections', HomeSections)
  },
} satisfies Theme
