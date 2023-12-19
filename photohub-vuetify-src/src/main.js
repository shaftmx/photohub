/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

const app = createApp(App)

import { createPinia  } from 'pinia'
app.use(createPinia()) // Create the root store

// define global properties
// app.config.globalProperties.foo = "bar";
// This could be used in any views that way this.foo

registerPlugins(app)
app.mount('#app')
