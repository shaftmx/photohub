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
      <v-btn v-if="photo && photo.published" icon variant="text" color="white"
        :loading="loadingUnpublish" @click="confirmAction('unpublish')" title="Move back to unpublished">
        <v-icon>mdi-cloud-off-outline</v-icon>
      </v-btn>
      <v-btn icon variant="text" color="error"
        :loading="loadingDelete" @click="confirmAction('delete')" title="Delete permanently">
        <v-icon>mdi-delete-outline</v-icon>
      </v-btn>
    </v-toolbar>

    <div v-if="loading" class="d-flex justify-center align-center pa-12">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <div v-if="!loading && photo" class="pa-4">
      <!-- Thumbnail -->
      <v-card rounded="lg" elevation="2" class="mb-4 overflow-hidden">
        <v-img :src="photoThumbUrl" :aspect-ratio="photo.width / photo.height" cover max-height="260">
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
          </template>
        </v-img>
      </v-card>

      <!-- Status chips -->
      <div class="mb-4 d-flex align-center gap-2">
        <v-chip :color="photo.published ? 'success' : 'warning'" size="small" variant="tonal"
          :prepend-icon="photo.published ? 'mdi-cloud-check' : 'mdi-folder-upload'">
          {{ photo.published ? 'Published' : 'Unpublished' }}
        </v-chip>
        <v-chip size="small" variant="outlined" class="ml-1">{{ photo.width }}×{{ photo.height }}</v-chip>
      </div>

      <PhotoDetailBody
        :photo="photo"
        :description-model="editDescription"
        :show-exif="showExif"
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
  <div v-else class="overflow-y-auto fill-height">
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
        <v-spacer></v-spacer>
        <v-btn v-if="viewId" icon size="small" variant="text" :color="isCover ? 'primary' : 'default'"
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
      </div>

      <PhotoDetailBody
        :photo="photo"
        :description-model="editDescription"
        :show-exif="showExif"
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
  </div>
</template>


<script>
import { defineComponent } from 'vue'
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
      return `${basePath}/${this.photo.hash_path}/${this.photo.filename}`
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
    async open(filename) {
      if (!this.embedded) this.displayed = true
      this.photo = null
      this.showExif = true
      this.loading = true

      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncFetch(`/api/photos/${filename}`)
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
