<template>
  <v-dialog v-model="displayed" fullscreen :scrim="false">
    <v-card style="display: flex; flex-direction: column; height: 100vh;">
      <!-- Toolbar -->
      <v-toolbar density="compact" color="primary">
        <v-toolbar-title class="text-body-1 font-weight-medium">
          Map — {{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }} with GPS
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
      </v-toolbar>

      <!-- Map -->
      <div ref="mapContainer" style="flex: 1; min-height: 0;"></div>
    </v-card>

    <!-- Photo viewer inside the map dialog to avoid dialog stacking issues -->
    <DisplayPhoto
      ref="displayPhoto"
      :photos="photos"
      :paths="paths"
      :readonly="true"
      :photo-detail-endpoint="photoDetailEndpoint"
    ></DisplayPhoto>
  </v-dialog>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAsyncFetch } from '../reactivefetch.js'
import DisplayPhoto from './DisplayPhoto.vue'

// Fix default marker icons broken by Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

export default {
  components: { DisplayPhoto },

  props: {
    mapEndpoint: { type: String, required: true },
    photoDetailEndpoint: { type: String, default: null },
  },

  data: () => ({
    displayed: false,
    photos: [],
    paths: {},
    map: null,
  }),

  methods: {
    async open() {
      this.displayed = true
      const { data, error } = await useAsyncFetch(this.mapEndpoint)
      if (error.value || data.value?.ERROR) return
      this.photos = data.value.data.photos
      this.paths = data.value.data.paths
      this.$nextTick(() => this.initMap())
    },

    close() {
      this.displayed = false
      if (this.map) {
        this.map.remove()
        this.map = null
      }
    },

    initMap() {
      if (this.map) {
        this.map.remove()
        this.map = null
      }
      const container = this.$refs.mapContainer
      if (!container || !this.photos.length) return

      this.map = L.map(container)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.map)

      const thumbBase = this.paths.xs || this.paths.s || Object.values(this.paths)[0] || ''
      const bounds = []

      for (const photo of this.photos) {
        const latlng = [photo.lat, photo.lng]
        bounds.push(latlng)

        const thumbFile = photo.type === 'video' ? photo.filename.replace('.mp4', '.jpg') : photo.filename
        const thumbUrl = `${thumbBase}/${photo.hash_path}/${thumbFile}`
        const popupHtml = `
          <div style="text-align:center; cursor:pointer;" data-filename="${photo.filename}">
            <img src="${thumbUrl}" style="width:120px; height:80px; object-fit:cover; border-radius:4px; display:block; margin-bottom:4px;">
            <span style="font-size:11px; color:#555;">${photo.origin_filename || photo.filename}</span>
          </div>
        `
        const marker = L.marker(latlng).addTo(this.map)
        marker.bindPopup(popupHtml, { maxWidth: 140 })
        marker.on('popupopen', () => {
          this.$nextTick(() => {
            const el = document.querySelector(`[data-filename="${photo.filename}"]`)
            if (el) el.addEventListener('click', () => this.$refs.displayPhoto.displayPhoto(photo.filename))
          })
        })
      }

      if (bounds.length) this.map.fitBounds(bounds, { padding: [40, 40] })
    },
  },
}
</script>
