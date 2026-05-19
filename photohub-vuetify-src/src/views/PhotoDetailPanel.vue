<template>
  <!-- ── DRAWER MODE (standalone) ── -->
  <v-navigation-drawer
    v-if="!embedded"
    v-model="displayed"
    location="right"
    temporary
    :width="sharedDatas && sharedDatas.isMobile ? '100%' : 480"
    class="photo-detail-drawer"
  >
    <v-toolbar color="primary" density="compact">
      <v-btn icon @click="close()"><v-icon>mdi-close</v-icon></v-btn>
      <v-toolbar-title class="text-body-1 font-weight-medium">Photo details</v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- Download menu (always visible — read action) -->
      <v-menu v-if="photo">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="text" color="white" title="Download">
            <v-icon>mdi-download-outline</v-icon>
          </v-btn>
        </template>
        <v-card min-width="180">
          <v-list density="compact" nav>
            <v-list-subheader>Download</v-list-subheader>
            <v-list-item v-for="size in downloadSizes" :key="size.key" :title="size.label"
              @click="downloadAt(size.key)">
              <template #prepend><v-icon size="18">mdi-download-outline</v-icon></template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
      <template v-if="!readonly">
        <v-btn v-if="photo && photo.published" icon variant="text" color="white"
          :loading="loadingUnpublish" @click="confirmAction('unpublish')" title="Move back to unpublished">
          <v-icon>mdi-cloud-off-outline</v-icon>
        </v-btn>
        <v-btn icon variant="text" color="error"
          :loading="loadingDelete" @click="confirmAction('delete')" title="Delete permanently">
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </template>
    </v-toolbar>

    <div v-if="loading" class="d-flex justify-center align-center pa-12">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <div v-if="!loading && photo" class="pa-4">
      <!-- Thumbnail -->
      <v-card rounded="lg" elevation="2" class="mb-4 overflow-hidden" style="position:relative;">
        <v-img :src="photoThumbUrl" :aspect-ratio="photo.width / photo.height" cover max-height="260">
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
          </template>
        </v-img>
        <div v-if="photo.type === 'video'" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <v-icon size="56" color="white" style="opacity:0.85">mdi-play-circle</v-icon>
        </div>
      </v-card>

      <!-- Status chips -->
      <div class="mb-4 d-flex align-center gap-2">
        <v-chip :color="photo.published ? 'success' : 'warning'" size="small" variant="tonal"
          :prepend-icon="photo.published ? 'mdi-cloud-check' : 'mdi-folder-upload'">
          {{ photo.published ? 'Published' : 'Unpublished' }}
        </v-chip>
        <v-chip size="small" variant="outlined" class="ml-1">{{ photo.width }}×{{ photo.height }}</v-chip>
        <v-chip v-if="photo.type === 'video' && photo.duration" size="small" variant="outlined" prepend-icon="mdi-clock-outline">{{ formatDuration(photo.duration) }}</v-chip>
        <v-chip v-if="photo.type === 'video' && photo.transcode_status !== 'done'" size="small" :color="photo.transcode_status === 'error' ? 'error' : 'warning'" variant="tonal" prepend-icon="mdi-cog-outline">{{ photo.transcode_status }}</v-chip>
      </div>

      <PhotoDetailBody
        :photo="photo"
        :description-model="editDescription"
        :show-exif="showExif"
        :readonly="readonly"
        @update:descriptionModel="editDescription = $event"
        @update:showExif="showExif = $event"
        @saveDescription="saveDescription"
        @editTags="editTagsDialog = true"
        @toggleFavorite="doToggleFavorite"
        @setRating="doSetRating"
      />
    </div>

    <ConfirmDialog v-model="confirmDialog" :action="confirmDialogAction"
      :loading="loadingDelete || loadingUnpublish" @confirm="executeAction" />

    <!-- Edit tags dialog — opens when user clicks "Edit" in the tags section -->
    <EditTagsDialog v-model="editTagsDialog" :photo="photo" @tagsUpdated="onTagsUpdated" />
  </v-navigation-drawer>

  <!-- ── EMBEDDED MODE (inside DisplayPhoto split layout) ── -->
  <v-sheet v-else class="overflow-y-auto fill-height" style="background: transparent;">
    <div v-if="loading" class="d-flex justify-center align-center pa-12">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <div v-if="!loading && photo" class="pa-4">
      <!-- Status + action buttons -->
      <div class="mb-4 d-flex align-center flex-wrap ga-1">
        <v-chip :color="photo.published ? 'success' : 'warning'" size="small" variant="tonal"
          :prepend-icon="photo.published ? 'mdi-cloud-check' : 'mdi-folder-upload'">
          {{ photo.published ? 'Published' : 'Unpublished' }}
        </v-chip>
        <v-chip size="small" variant="outlined">{{ photo.width }}×{{ photo.height }}</v-chip>
        <v-chip v-if="photo.type === 'video' && photo.duration" size="small" variant="outlined" prepend-icon="mdi-clock-outline">{{ formatDuration(photo.duration) }}</v-chip>
        <v-chip v-if="photo.type === 'video' && photo.transcode_status !== 'done'" size="small" :color="photo.transcode_status === 'error' ? 'error' : 'warning'" variant="tonal" prepend-icon="mdi-cog-outline">{{ photo.transcode_status }}</v-chip>
        <v-spacer></v-spacer>
        <!-- Download menu (always visible — read action) -->
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" icon size="small" variant="text" title="Download">
              <v-icon>mdi-download-outline</v-icon>
            </v-btn>
          </template>
          <v-card min-width="180">
            <v-list density="compact" nav>
              <v-list-subheader>Download</v-list-subheader>
              <v-list-item v-for="size in downloadSizes" :key="size.key" :title="size.label"
                @click="downloadAt(size.key)">
                <template #prepend><v-icon size="18">mdi-download-outline</v-icon></template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
        <template v-if="!readonly">
          <v-btn v-if="viewId" icon size="small" variant="text" :color="isCover ? 'primary' : undefined"
            :loading="loadingCover" @click="setCover()" :title="isCover ? 'Remove cover' : 'Set as cover'">
            <v-icon>{{ isCover ? 'mdi-book-open-page-variant' : 'mdi-book-open-page-variant-outline' }}</v-icon>
          </v-btn>
          <v-btn v-if="photo.published" icon size="small" variant="text" :loading="loadingUnpublish"
            @click="confirmAction('unpublish')" title="Move back to unpublished">
            <v-icon>mdi-cloud-off-outline</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" :loading="loadingDelete"
            @click="confirmAction('delete')" title="Delete permanently">
            <v-icon>mdi-delete-outline</v-icon>
          </v-btn>
        </template>
      </div>

      <PhotoDetailBody
        :photo="photo"
        :description-model="editDescription"
        :show-exif="showExif"
        :readonly="readonly"
        @update:descriptionModel="editDescription = $event"
        @update:showExif="showExif = $event"
        @saveDescription="saveDescription"
        @editTags="editTagsDialog = true"
        @toggleFavorite="doToggleFavorite"
        @setRating="doSetRating"
      />
    </div>

    <ConfirmDialog v-model="confirmDialog" :action="confirmDialogAction"
      :loading="loadingDelete || loadingUnpublish" @confirm="executeAction" />

    <!-- Edit tags dialog — opens when user clicks "Edit" in the tags section -->
    <EditTagsDialog v-model="editTagsDialog" :photo="photo" @tagsUpdated="onTagsUpdated" />
  </v-sheet>
</template>


<script>
import { defineComponent } from 'vue'
import { thumbFilename, formatDuration } from '../photoUtils.js'
import { getSharedDatas } from '../sharedDatas.js'
import { useAlertStore } from '../stores/alert'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import PhotoDetailBody from '../components/PhotoDetailBody.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import EditTagsDialog from '../components/EditTagsDialog.vue'

export default defineComponent({
  components: { PhotoDetailBody, ConfirmDialog, EditTagsDialog },

  props: {
    embedded: { type: Boolean, default: false },
    viewId: { type: [String, Number], default: null },
    coverFilename: { type: String, default: null },
    readonly: { type: Boolean, default: false },
    photoDetailEndpoint: { type: String, default: null },
  },

  emits: ['closed', 'deleted', 'unpublished'],

  data: () => ({
    displayed: false,
    loading: false,
    loadingDelete: false,
    loadingUnpublish: false,
    loadingCover: false,
    photo: null,
    paths: {},
    editDescription: '',
    showExif: true,
    confirmDialog: false,
    confirmDialogAction: null,
    editTagsDialog: false,
    sharedDatas: {},
    localCoverFilename: null,
  }),

  computed: {
    isCover() {
      return this.photo && this.localCoverFilename === this.photo.filename
    },

    photoThumbUrl() {
      if (!this.photo || !this.paths) return ''
      const size = this.sharedDatas.isMobile ? 'xs' : 's'
      const basePath = this.paths[size] || Object.values(this.paths)[0] || ''
      return `${basePath}/${this.photo.hash_path}/${thumbFilename(this.photo)}`
    },

    // Available download sizes — same pattern as ViewDetail.downloadSizes.
    // Samples (xs/s/m/l) sorted by max-pixel-size, raw (original) appended last.
    downloadSizes() {
      if (!this.paths || !this.photo) return []
      const sizeMeta = this.paths._sizes || {}
      const sizes = Object.keys(this.paths).filter(k => k !== '_sizes' && k !== 'raw')
      sizes.sort((a, b) => (sizeMeta[a] || 0) - (sizeMeta[b] || 0))
      const items = sizes.map(k => ({
        key: k,
        label: sizeMeta[k] ? `${k.toUpperCase()} (${sizeMeta[k]}px)` : k.toUpperCase(),
      }))
      items.push({ key: 'raw', label: 'RAW (original)' })
      return items
    },
  },

  watch: {
    coverFilename(val) {
      this.localCoverFilename = val
    },
  },

  mounted() {
    this.sharedDatas = getSharedDatas(this)
    this.localCoverFilename = this.coverFilename
  },

  methods: {
    formatDuration,

    // Trigger a browser download of the photo at the requested size.
    //   photo : xs/s/m/l → JPG sample at the requested size, raw → original JPG.
    //   video : there is no per-size video rendition on disk (samples are JPG
    //           posters), so xs/s/m/l all serve the transcoded MP4. raw serves
    //           the preserved source file (<md5>_original.<ext>) when
    //           KEEP_ORIGINAL_VIDEO kept one, otherwise the transcoded MP4.
    // Saved-as filename mirrors the served bytes: keeps origin_filename when
    // its extension matches what we ship, otherwise rewrites the extension so
    // the user doesn't end up with a .mov that's actually .mp4.
    downloadAt(size) {
      if (!this.photo || !this.paths || !this.paths[size]) return
      const photo = this.photo
      let url
      let savedAs
      if (photo.type === 'video') {
        const stem = (photo.origin_filename || photo.filename).replace(/\.[^.]+$/, '')
        if (size === 'raw' && photo.original_ext) {
          const fileStem = photo.filename.replace(/\.[^.]+$/, '')
          url = `${this.paths.raw}/${photo.hash_path}/${fileStem}_original.${photo.original_ext}`
          savedAs = photo.origin_filename || `${stem}.${photo.original_ext}`
        } else {
          url = `${this.paths.raw}/${photo.hash_path}/${photo.filename}`
          savedAs = `${stem}.mp4`
        }
      } else {
        const fname = size === 'raw' ? photo.filename : thumbFilename(photo)
        url = `${this.paths[size]}/${photo.hash_path}/${fname}`
        savedAs = photo.origin_filename || fname
      }
      const a = document.createElement('a')
      a.href = url
      a.download = savedAs
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },

    async open(filename) {
      if (!this.embedded) this.displayed = true
      this.photo = null
      this.showExif = true
      this.loading = true

      const { triggerAlert } = useAlertStore()
      const base = this.photoDetailEndpoint || '/api/photos'
      const { data, error } = await useAsyncFetch(`${base}/${filename}`)
      if (error.value) {
        triggerAlert('error', 'Loading error', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.photo = data.value.data.photo
        this.paths = data.value.data.paths
        this.editDescription = this.photo.description || ''
      }
      this.loading = false
    },

    close() {
      if (!this.embedded) this.displayed = false
      this.$emit('closed')
    },

    async doToggleFavorite() {
      if (!this.photo) return
      const newValue = !this.photo.favorite
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/update`, { favorite: newValue })
      if (error.value) {
        triggerAlert('error', 'Save error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.photo.favorite = newValue
      }
    },

    async doSetRating(rating) {
      if (!this.photo) return
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/update`, { rating })
      if (error.value) {
        triggerAlert('error', 'Save error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.photo.rating = rating
      }
    },

    async saveDescription() {
      if (!this.photo) return
      if (this.editDescription === this.photo.description) return

      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/update`, {
        description: this.editDescription
      })
      if (error.value) {
        triggerAlert('error', 'Save error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.photo.description = this.editDescription
        triggerAlert('success', 'Description saved', '')
      }
    },

    // Called when EditTagsDialog successfully saves — reload photo to reflect new tags
    onTagsUpdated(filename) {
      this.open(filename)
    },

    confirmAction(action) {
      this.confirmDialogAction = action
      this.confirmDialog = true
    },

    async executeAction() {
      if (this.confirmDialogAction === 'delete') {
        await this.doDelete()
      } else {
        await this.doUnpublish()
      }
      this.confirmDialog = false
    },

    async doDelete() {
      this.loadingDelete = true
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/delete`, {})
      if (error.value) {
        triggerAlert('error', 'Delete error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        triggerAlert('success', 'Photo deleted', '')
        this.$emit('deleted', this.photo.filename)
        this.close()
      }
      this.loadingDelete = false
    },

    async setCover() {
      if (!this.photo || !this.viewId) return
      this.loadingCover = true
      const { triggerAlert } = useAlertStore()
      const newCover = this.isCover ? null : this.photo.filename
      const { data, error } = await useAsyncPost(`/api/views/${this.viewId}/update`, { cover_filename: newCover })
      if (error.value) {
        triggerAlert('error', 'Save error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.localCoverFilename = newCover
      }
      this.loadingCover = false
    },

    async doUnpublish() {
      this.loadingUnpublish = true
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/unpublish`, {})
      if (error.value) {
        triggerAlert('error', 'Error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        triggerAlert('success', 'Photo unpublished', '')
        this.$emit('unpublished', this.photo.filename)
        this.close()
      }
      this.loadingUnpublish = false
    },
  },
})
</script>

<style scoped>
.photo-detail-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}
</style>
