import { defineStore } from 'pinia'
import { useAsyncFetch } from '../reactivefetch.js'

const TTL_MS = 60_000 // 1 minute

export const useAppConfigStore = defineStore('appConfig', {
  state: () => ({
    galleryPageSizeDesktop: 600,
    galleryPageSizeMobile: 500,
    _loadedAt: null,
  }),
  actions: {
    async load() {
      if (this._loadedAt && Date.now() - this._loadedAt < TTL_MS) return
      const { data } = await useAsyncFetch('/api/app-config')
      if (data.value && !data.value.ERROR) {
        const d = data.value.data
        if (d.GALLERY_PAGE_SIZE_DESKTOP) this.galleryPageSizeDesktop = parseInt(d.GALLERY_PAGE_SIZE_DESKTOP)
        if (d.GALLERY_PAGE_SIZE_MOBILE)  this.galleryPageSizeMobile  = parseInt(d.GALLERY_PAGE_SIZE_MOBILE)
      }
      this._loadedAt = Date.now()
    },
    invalidate() {
      this._loadedAt = null
    },
    galleryLimit(isMobile) {
      return isMobile ? this.galleryPageSizeMobile : this.galleryPageSizeDesktop
    },
  },
})
