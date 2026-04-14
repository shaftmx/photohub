<template>
  <v-container class="bg-black mb-7 pa-0">
  <v-app-bar flat class="bg-primary" :density="density">
    <v-app-bar-title>
      <span class="logo-link" @click="$router.push({ name: 'Home' })">
        <img src="/icon.svg" alt="PhotoHub" class="logo-icon" />
        PhotoHub
      </span>
    </v-app-bar-title>

    <!-- Right menu -->
    <template v-slot:append>
      <v-menu v-model="menu" :close-on-content-click="false" location="bottom">
        <template v-slot:activator="{ props }">
          <v-app-bar-nav-icon v-bind="props"></v-app-bar-nav-icon>
        </template>

        <v-card min-width="260">
          <!-- Authenticated: user info + full menu -->
          <template v-if="isAuthenticated">
            <v-list>
              <v-list-item prepend-icon="mdi-account-circle" :title="username">
              </v-list-item>
            </v-list>
            <v-divider></v-divider>
            <v-list nav density="compact">
              <v-list-item v-for="(item, index) in authItems" :key="index" :value="index"
                color="primary" @click="menuActionClick(item.action)">
                <template v-slot:prepend>
                  <v-icon :icon="item.icon"></v-icon>
                </template>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item class="py-1" @click="darkTheme = !darkTheme; toggleTheme()">
                <template v-slot:prepend>
                  <v-icon :icon="darkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night'" size="small"></v-icon>
                </template>
                <v-list-item-title class="text-caption text-medium-emphasis">Dark theme</v-list-item-title>
                <template v-slot:append>
                  <v-icon size="x-small" :color="darkTheme ? 'primary' : 'medium-emphasis'">
                    {{ darkTheme ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}
                  </v-icon>
                </template>
              </v-list-item>
            </v-list>
          </template>

          <!-- Not authenticated: minimal menu -->
          <template v-else>
            <v-list nav density="compact">
              <v-list-item color="primary" @click="menuActionClick('Login')">
                <template v-slot:prepend>
                  <v-icon icon="mdi-login-variant" color="primary"></v-icon>
                </template>
                <v-list-item-title class="text-primary font-weight-medium">Login</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item class="py-1" @click="darkTheme = !darkTheme; toggleTheme()">
                <template v-slot:prepend>
                  <v-icon :icon="darkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night'" size="small"></v-icon>
                </template>
                <v-list-item-title class="text-caption text-medium-emphasis">Dark theme</v-list-item-title>
                <template v-slot:append>
                  <v-icon size="x-small" :color="darkTheme ? 'primary' : 'medium-emphasis'">
                    {{ darkTheme ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}
                  </v-icon>
                </template>
              </v-list-item>
            </v-list>
          </template>
        </v-card>
      </v-menu>
    </template>
  </v-app-bar>
</v-container>
</template>

<script>
import { useTheme } from 'vuetify'
import { getSharedDatas } from '../../sharedDatas.js'
import { useAsyncFetch } from '../../reactivefetch.js'

export default {
  data: () => ({
    authItems: [
      { title: 'Home', icon: 'mdi-home', action: 'Home' },
      { title: 'Photos', icon: 'mdi-image', action: 'Photos' },
      { title: 'Views', icon: 'mdi-image-multiple', action: 'Views' },
      { title: 'Upload', icon: 'mdi-upload', action: 'Upload' },
      { title: 'Unpublished', icon: 'mdi-folder-upload', action: 'Unpublished' },
      { title: 'Logout', icon: 'mdi-logout', action: 'Logout' },
    ],
    theme: useTheme(),
    menu: false,
    darkTheme: false,
    density: "default",
    sharedDatas: {},
    isAuthenticated: false,
    username: '',
  }),
  watch: {
    $route() {
      this.checkAuth()
    }
  },

  mounted() {
    this.sharedDatas = getSharedDatas(this)
    this.checkAuth()

    if (localStorage.persistentDarkTheme) {
        this.darkTheme = JSON.parse(localStorage.getItem('persistentDarkTheme'))
        this.toggleTheme()
    }

    if (this.sharedDatas.isMobile) {
      this.density = "compact"
    }
  },
  methods: {
    async checkAuth() {
      const { data, error } = await useAsyncFetch('/api/is_authenticated')
      if (!error.value && data.value && !data.value.ERROR) {
        this.isAuthenticated = true
        this.username = data.value.data?.username || 'Account'
      }
    },
    menuActionClick(action) {
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

<style scoped>
.logo-link {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  filter: brightness(0) invert(1);  /* white on purple AppBar */
}
</style>
