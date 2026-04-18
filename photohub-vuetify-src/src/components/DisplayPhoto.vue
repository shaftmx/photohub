<template>
  <v-sheet>
    <v-dialog v-model="displayed" fullscreen :scrim="false">
      <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden; background: #1a1a1a;">

        <div class="d-flex flex-grow-1 overflow-hidden" style="min-height: 0; position: relative;">

          <!-- Floating toolbar -->
          <div class="photo-toolbar">
            <span class="photo-toolbar-title ml-2">{{ currentPhotoName }}</span>
            <v-spacer></v-spacer>
            <!-- Mobile: back to photo when detail panel is open -->
            <v-btn v-if="showDetail && sharedDatas.isMobile" variant="text" size="x-small" color="white"
              prepend-icon="mdi-arrow-left" @click="showDetail = false">Photo</v-btn>
            <!-- Detail toggle -->
            <v-btn variant="text" size="x-small" color="white"
              :icon="showDetail ? 'mdi-information' : 'mdi-information-outline'"
              @click="toggleDetail()" :disabled="!displayedPhoto">
            </v-btn>
            <v-btn icon size="x-small" variant="text" color="white" @click="closePhoto()">
              <v-icon size="16">mdi-close</v-icon>
            </v-btn>
          </div>

          <!-- Carousel (hidden on mobile when detail is open) -->
          <div
            v-show="!showDetail || !sharedDatas.isMobile"
            class="flex-grow-1 overflow-hidden"
            style="min-height: 0;"
          >
            <v-carousel
              :show-arrows="!sharedDatas.isMobile"
              height="100%"
              hide-delimiters
              show-arrows="hover"
              v-model="displayedPhoto"
            >
              <v-carousel-item
                v-for="(photo) in photos"
                :key="photo.filename"
                :value="photo.filename"
                :src="paths[sharedDatas.displayPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']"
              ></v-carousel-item>
            </v-carousel>
          </div>

          <!-- Detail panel (full width on mobile, fixed width on desktop) -->
          <div
            v-if="showDetail"
            class="overflow-y-auto detail-panel"
            :style="sharedDatas.isMobile
              ? 'width: 100%; min-height: 0; padding-top: 40px;'
              : 'width: 480px; min-height: 0; border-left: 1px solid rgba(255,255,255,0.1); padding-top: 40px;'"
          >
            <v-theme-provider theme="dark">
              <PhotoDetail
                ref="photoDetail"
                :embedded="true"
                :view-id="viewId"
                :cover-filename="coverFilename"
                :readonly="readonly"
                @deleted="onDeleted"
                @unpublished="onUnpublished"
              />
            </v-theme-provider>
          </div>
        </div>

      </v-card>
    </v-dialog>
  </v-sheet>
</template>


<script>
import { defineComponent } from 'vue'
import { getSharedDatas } from '../sharedDatas.js'
import PhotoDetail from '../views/PhotoDetail.vue'

export default defineComponent({
  components: { PhotoDetail },

  props: {
    photos: Array,
    paths: Object,
    viewId: { type: [String, Number], default: null },
    coverFilename: { type: String, default: null },
    readonly: { type: Boolean, default: false },
  },

  emits: ['photoDeleted', 'photoUnpublished'],

  data: () => ({
    displayed: false,
    displayedPhoto: null,
    showDetail: false,
    sharedDatas: {},
  }),

  computed: {
    currentPhotoName() {
      const photo = (this.photos || []).find(p => p.filename === this.displayedPhoto)
      return (photo && photo.origin_filename) || this.displayedPhoto || 'Photo'
    },
  },

  mounted() {
    this.sharedDatas = getSharedDatas(this)
    if (this.$route.query.displayPhoto) {
      this.displayedPhoto = this.$route.query.displayPhoto
      this.displayed = true
    }
    window.addEventListener('keydown', this.onKeyDown)
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeyDown)
  },

  watch: {
    'displayedPhoto'(newPhotoName, oldPhotoName) {
      console.log('--watch displayedPhoto')
      if (oldPhotoName == null && newPhotoName != null) {
        this.$router.push(this.urlQueryDisplayPhoto(newPhotoName))
      } else if (oldPhotoName != null && newPhotoName != null) {
        this.$router.replace(this.urlQueryDisplayPhoto(newPhotoName))
      }
      // Refresh detail panel when switching photos
      if (this.showDetail && newPhotoName) {
        this.$nextTick(() => this.$refs.photoDetail?.open(newPhotoName))
      }
    },

    '$route.query.displayPhoto'(newDisplayPhoto) {
      console.log('--watch route.query.displayPhoto')
      if (!newDisplayPhoto) {
        this.closePhoto()
      }
    },

    'showDetail'(val) {
      if (val && this.displayedPhoto) {
        this.$nextTick(() => this.$refs.photoDetail?.open(this.displayedPhoto))
      }
    },
  },

  methods: {
    urlQueryDisplayPhoto(photoName) {
      let q = { ...this.$route.query }
      if (photoName != null) {
        q.displayPhoto = photoName
      } else {
        delete q.displayPhoto
      }
      return { query: q }
    },

    closePhoto() {
      this.displayed = false
      this.displayedPhoto = null
      this.showDetail = false
      this.$router.replace(this.urlQueryDisplayPhoto(null))
    },

    displayPhoto(photoName) {
      this.displayedPhoto = photoName
      this.displayed = true
    },

    toggleDetail() {
      this.showDetail = !this.showDetail
    },

    onDeleted(filename) {
      this.$emit('photoDeleted', filename)
      this.closePhoto()
    },

    onUnpublished(filename) {
      this.$emit('photoUnpublished', filename)
      this.closePhoto()
    },

    onKeyDown(e) {
      if (!this.displayed) return
      if (e.key === 'ArrowRight') this.navigate(1)
      else if (e.key === 'ArrowLeft') this.navigate(-1)
      else if (e.key === 'Escape') this.closePhoto()
    },

    navigate(dir) {
      const idx = this.photos.findIndex(p => p.filename === this.displayedPhoto)
      if (idx === -1) return
      const next = this.photos[idx + dir]
      if (next) this.displayedPhoto = next.filename
    },

  },
})
</script>

<style scoped>
.photo-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  height: 40px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%);
  color: white;
}

.photo-toolbar-title {
  font-size: 0.75rem;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 0;
  min-width: 0;
}

.photo-toolbar .v-btn {
  opacity: 0.7;
  transition: opacity 0.15s ease, background 0.15s ease;
}

.photo-toolbar .v-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

:deep(.v-carousel__controls) {
  display: none;
}

:deep(.v-window__controls .v-btn) {
  background: rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.6) !important;
  backdrop-filter: blur(2px);
  transition: background 0.15s ease, color 0.15s ease;
}

.detail-panel {
  background: #242424;
  color: rgba(255, 255, 255, 0.87);
}

:deep(.v-window__controls .v-btn:hover) {
  background: rgba(255, 255, 255, 0.25) !important;
  color: rgba(255, 255, 255, 0.95) !important;
}
</style>
