// Global auth store — populated by AppBar on every route change.
// All views read role/isAuthenticated from here instead of calling the API themselves.

import { defineStore } from 'pinia'
import { useAsyncFetch } from '../reactivefetch.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    id: null,
    username: '',
    role: '',  // "admin" | "contributor" | "member" | "unknown" | ""
  }),
  getters: {
    // Contributor or above: can upload, edit photos, manage views
    canEdit: (state) => state.role === 'admin' || state.role === 'contributor',
    // Admin only
    isAdmin: (state) => state.role === 'admin',
  },
  actions: {
    async fetchAuth() {
      const { data, error } = await useAsyncFetch('/api/is_authenticated')
      if (!error.value && data.value && !data.value.ERROR) {
        this.isAuthenticated = true
        this.id = data.value.data?.id || null
        this.username = data.value.data?.username || ''
        this.role = data.value.data?.role || ''
      } else {
        this.isAuthenticated = false
        this.id = null
        this.username = ''
        this.role = ''
      }
    },
  },
})
