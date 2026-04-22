import { defineStore } from 'pinia'
import { useAsyncFetch } from '../reactivefetch.js'

const TTL_MS = 60_000 // 1 minute

export const useAppConfigStore = defineStore('appConfig', {
  state: () => ({
    galleryPageSizeDesktop: 600,
    galleryPageSizeMobile:  500,
    displayPhotoSize:       'l',
    displayPhotoSizeMobile: 'm',
    gridSize:        350,
    gridMin:         100,
    gridMax:         600,
    gridSizeMobile:  60,
    gridMinMobile:   40,
    gridMaxMobile:   120,
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
        if (d.DISPLAY_PHOTO_SIZE)        this.displayPhotoSize        = d.DISPLAY_PHOTO_SIZE
        if (d.DISPLAY_PHOTO_SIZE_MOBILE) this.displayPhotoSizeMobile  = d.DISPLAY_PHOTO_SIZE_MOBILE
        if (d.GRID_SIZE)        this.gridSize       = parseInt(d.GRID_SIZE)
        if (d.GRID_MIN)         this.gridMin        = parseInt(d.GRID_MIN)
        if (d.GRID_MAX)         this.gridMax        = parseInt(d.GRID_MAX)
        if (d.GRID_SIZE_MOBILE) this.gridSizeMobile = parseInt(d.GRID_SIZE_MOBILE)
        if (d.GRID_MIN_MOBILE)  this.gridMinMobile  = parseInt(d.GRID_MIN_MOBILE)
        if (d.GRID_MAX_MOBILE)  this.gridMaxMobile  = parseInt(d.GRID_MAX_MOBILE)
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
