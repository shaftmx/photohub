<template>
  <v-container class="bg-black mb-7 pa-0">
  <v-app-bar flat class="bg-primary" :density="density">
    <v-app-bar-title>
      <v-icon icon="mdi-circle-slice-4" />
      PhotoHub
    </v-app-bar-title>

    <!-- Right menu -->
    <template v-slot:append>
      <v-menu v-model="menu" :close-on-content-click="false" location="bottom">
        <template v-slot:activator="{ props }">
          <v-app-bar-nav-icon v-bind="props"></v-app-bar-nav-icon>
        </template>

        <v-card min-width="300">
          <v-list>
            <v-list-item prepend-avatar="https://cdn.vuetifyjs.com/images/john.jpg" title="John Leider"
              subtitle="Founder of Vuetify">
              <template v-slot:append>
                <v-btn variant="text" :class="darkTheme ? 'text-red' : ''" icon="mdi-heart"
                  @click="darkTheme = !darkTheme"></v-btn>
              </template>
            </v-list-item>
          </v-list>

          <v-divider></v-divider>


          <v-list nav density="compact">
            <!-- Links -->
            <v-list-item v-for="(item, index) in items" @click="menuActionClick(item.action)" :key="index" :value="index"
              color="primary">
              <template v-slot:prepend>
                <v-icon :icon="item.icon"></v-icon>
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>

            <v-divider></v-divider>

            <v-list-item>
              <v-switch v-model="darkTheme" color="primary" label="Darak theme" @change="toggleTheme()"
                hide-details></v-switch>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </template>
  </v-app-bar>
</v-container>
</template>

<script>
import { useTheme } from 'vuetify'
import { getSharedDatas } from '../../sharedDatas.js'

export default {
  data: () => ({
    items: [
      { title: 'Upload', icon: 'mdi-upload', action: 'Upload' },
      { title: 'Unpublished', icon: 'mdi-folder-upload', action: 'Unpublished' },
      { title: 'Photos', icon: 'mdi-image', action: 'Photos' },
      { title: 'Views', icon: 'mdi-image-multiple', action: 'Views' },
      { title: 'Home', icon: 'mdi-home', action: 'Home' },
      { title: 'Logout', icon: 'mdi-account', action: 'Logout' },
    ],
    theme: useTheme(),
    menu: false,
    darkTheme: false,
    density: "default",
    sharedDatas: {},
  }),
  mounted() {
    this.sharedDatas = getSharedDatas(this)

    window.console.log("--nav: Get localstorage theme")
    if (localStorage.persistentDarkTheme) {
        this.darkTheme = JSON.parse(localStorage.getItem('persistentDarkTheme'))
        // Call toggle theme anyway to ensure we switch to the right theme if different from default
        this.toggleTheme()
    }

    // Mobile override
    if (this.sharedDatas.isMobile) {
      this.density = "compact"
    }

  },
  methods: {
    menuActionClick(action) {
      console.log("--menuActionClick " + action)
      this.menu = false
      this.$router.push({ name: action })
    },
    toggleTheme() {
      if (this.darkTheme) {
        this.theme.global.name = 'dark'
      } else {
        this.theme.global.name = 'light'
      }
      // Save it to local storage
      localStorage.setItem('persistentDarkTheme', JSON.stringify(this.darkTheme))
    }
  },

}
</script>


