<template>
  <TagPhotos @closed="doGetPhotos(); displayed = true" ref="tagPhotos" :paths="paths" :allPhotos="photos"
    :selectedPhotosFilenames="selectedPhotosFilenames"></TagPhotos>

  <PhotoDetail ref="photoDetail" @deleted="onPhotoDeleted" @unpublished="onPhotoUnpublished" />

  <v-sheet v-if="displayed">

    <!-- Header -->
    <v-sheet>
      <v-sheet :class="!sharedDatas.isMobile ? 'ma-2 pa-2 me-auto' : ''">
        <PageTitle
          :title="title"
          :is-mobile="sharedDatas.isMobile"
          :count="photos.length"
          :total="total"
          :subtitle="subtitle"
        />
      </v-sheet>

      <!-- Row 1: selection controls + bulk actions menu
           BulkActionsMenu provides: count display, select/deselect-all btn, Actions dropdown,
           built-in favorites and rating items. View-specific actions go in the default slot. -->
      <v-sheet class="d-flex mb-2">
        <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-center ga-2">
          <BulkActionsMenu
            :selected-count="selectedPhotosFilenames.length"
            :filenames="selectedPhotosFilenames"
            :is-mobile="sharedDatas.isMobile"
            @select-all="selectAll"
            @deselect-all="deselectAll"
            @done="deselectAll(); doGetPhotos()"
          >
            <!-- Unpublished-specific actions: tag + publish at top, delete at bottom -->
            <v-list-item @click="displayed = false; $refs.tagPhotos.open()">
              <template #prepend><v-icon color="primary" class="mr-4">mdi-tag-arrow-right</v-icon></template>
              <v-list-item-title>Tag</v-list-item-title>
            </v-list-item>
            <v-list-item @click="confirmPublishDialog = true; loading = true">
              <template #prepend><v-icon color="secondary" class="mr-4">mdi-cloud-check</v-icon></template>
              <v-list-item-title>Publish</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="confirmDeleteDialog = true">
              <template #prepend><v-icon color="error" class="mr-4">mdi-delete</v-icon></template>
              <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
          </BulkActionsMenu>
        </v-sheet>
      </v-sheet>

      <!-- Row 2: tag filter -->
      <v-sheet class="d-flex mb-2 align-center">
        <v-btn-toggle v-model="tagFilter" mandatory density="compact" variant="outlined" color="primary"
          @update:modelValue="doGetPhotos()">
          <v-btn value="all" :size="sharedDatas.isMobile ? 'x-small' : 'small'">
            <v-icon :size="sharedDatas.isMobile ? 14 : 18">mdi-tag-multiple-outline</v-icon>
            <v-tooltip activator="parent" location="top">All</v-tooltip>
          </v-btn>
          <v-btn value="untagged" :size="sharedDatas.isMobile ? 'x-small' : 'small'">
            <v-icon :size="sharedDatas.isMobile ? 14 : 18">mdi-tag-off-outline</v-icon>
            <v-tooltip activator="parent" location="top">Untagged</v-tooltip>
          </v-btn>
          <v-btn value="tagged" :size="sharedDatas.isMobile ? 'x-small' : 'small'">
            <v-icon :size="sharedDatas.isMobile ? 14 : 18">mdi-tag-check-outline</v-icon>
            <v-tooltip activator="parent" location="top">Tagged</v-tooltip>
          </v-btn>
        </v-btn-toggle>
      </v-sheet>

      <!-- Row 3: sort + grid size slider -->
      <v-sheet class="d-flex mb-2 align-center">
        <SortControls v-model:sortBy="sortBy" v-model:sortDir="sortDir" @update:sortBy="doGetPhotos()" @update:sortDir="doGetPhotos()"></SortControls>
        <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-end justify-end w-50">
          <v-slider v-model="sharedDatas.gridSize" style="max-width: 300px; width: 100%" :max="sharedDatas.gridMax"
            :min="sharedDatas.gridMin" hide-details color="primary" append-icon="mdi-image-size-select-actual"
            density="compact" track-size="2" thumb-size="15">
          </v-slider>
        </v-sheet>
      </v-sheet>
    </v-sheet>

    <!-- CONFIRM PUBLISHING -->
    <v-dialog v-model="confirmPublishDialog" persistent width="auto">
      <v-card>
        <v-card-title class="text-h5">Publish {{ selectedPhotosFilenames.length }} photo{{ selectedPhotosFilenames.length > 1 ? 's' : '' }}?</v-card-title>
        <v-card-text>Selected photos will be published and visible to all users.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" density="compact" variant="text" @click="confirmPublishDialog = false; loading = false">Cancel</v-btn>
          <v-btn color="primary" density="compact" variant="tonal" @click="confirmPublishDialog = false; publishSelected()">Publish</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CONFIRM DELETE -->
    <v-dialog v-model="confirmDeleteDialog" persistent width="auto">
      <v-card>
        <v-card-title class="text-h5">Delete {{ selectedPhotosFilenames.length }} photo{{ selectedPhotosFilenames.length > 1 ? 's' : '' }}?</v-card-title>
        <v-card-text>This will <strong>permanently delete</strong> the selected photos and their files. This cannot be undone.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" density="compact" variant="text" @click="confirmDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" density="compact" variant="tonal" @click="confirmDeleteDialog = false; deleteSelected()">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Photo grid -->
    <PhotoGrid :photos="photos" :paths="paths" :shared-datas="sharedDatas" show-favorite
      @item-click="(photo, index, event) => selectDeselect(photo, index, event)"
      @toggle-favorite="toggleFavorite">
      <template #overlay="{ photo, index }">
        <v-chip v-if="Object.keys(photo.tags).length === 0" class="no-tags-chip"
          color="error" size="x-small" variant="flat">no tags</v-chip>
        <div class="selection-overlay" :class="{ selected: selectedPhotosFilenames.includes(photo.filename) }"
          @click.stop="selectDeselect(photo, index, $event)">
          <v-icon v-if="selectedPhotosFilenames.includes(photo.filename)" color="white" size="28">mdi-check-circle</v-icon>
        </div>
        <button class="detail-btn" @click.stop="$refs.photoDetail.open(photo.filename)" title="Details">
          <v-icon size="18">mdi-information-outline</v-icon>
        </button>
      </template>
    </PhotoGrid>
  </v-sheet>
</template>


<script setup>
import TagPhotos from '@/components/TagPhotos.vue'
import PhotoDetail from '@/views/PhotoDetailPanel.vue'
import SortControls from '@/components/SortControls.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import PageTitle from '@/components/PageTitle.vue'
import BulkActionsMenu from '@/components/BulkActionsMenu.vue'
</script>


<script>
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { useAppConfigStore } from '../stores/appConfig.js'
import { getSharedDatas } from '../sharedDatas.js'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'

export default {
  data: () => ({
    confirmPublishDialog: false,
    confirmDeleteDialog: false,
    displayed: true,
    title: "Unpublished",
    subtitle: "All recently uploaded photos that have not been published",
    photos: [],
    total: 0,
    selectedPhotosFilenames: [],
    lastSelectedIndex: null, // anchor for shift+click range selection
    paths: {},
    sharedDatas: {},
    loading: false,
    sortBy: 'date',
    sortDir: 'desc',
    tagFilter: 'all',
  }),

  async mounted() {
    requireAuth(this)
    await useAppConfigStore().load()
    this.sharedDatas = getSharedDatas(this)
    this.doGetPhotos()
  },

  components: { TagPhotos, PhotoDetail },

  methods: {
    onPhotoDeleted(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
      this.selectedPhotosFilenames = this.selectedPhotosFilenames.filter(f => f !== filename)
    },

    onPhotoUnpublished() {
      this.doGetPhotos()
    },

    selectDeselect(photo, index, event) {
      // Shift+click: select/deselect the range between last clicked and current
      if (event?.shiftKey && this.lastSelectedIndex !== null) {
        const from = Math.min(this.lastSelectedIndex, index)
        const to = Math.max(this.lastSelectedIndex, index)
        const rangeFilenames = this.photos.slice(from, to + 1).map(p => p.filename)
        // If all photos in range are already selected → deselect the range, otherwise select all
        const allSelected = rangeFilenames.every(f => this.selectedPhotosFilenames.includes(f))
        if (allSelected) {
          this.selectedPhotosFilenames = this.selectedPhotosFilenames.filter(f => !rangeFilenames.includes(f))
        } else {
          rangeFilenames.forEach(f => { if (!this.selectedPhotosFilenames.includes(f)) this.selectedPhotosFilenames.push(f) })
        }
      } else {
        // Normal click: toggle single photo, remember index as anchor for next shift+click
        const idx = this.selectedPhotosFilenames.indexOf(photo.filename)
        if (idx === -1) this.selectedPhotosFilenames.push(photo.filename)
        else this.selectedPhotosFilenames.splice(idx, 1)
        this.lastSelectedIndex = index ?? null
      }
    },

    deselectAll() {
      this.selectedPhotosFilenames = []
      this.lastSelectedIndex = null
    },

    selectAll() {
      this.selectedPhotosFilenames = this.photos.map(p => p.filename)
    },

    async toggleFavorite(photo) {
      const newValue = !photo.favorite
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${photo.filename}/update`, { favorite: newValue })
      if (error.value) {
        triggerAlert('error', 'Save error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        photo.favorite = newValue
      }
    },

    async deleteSelected() {
      const { triggerAlert } = useAlertStore()
      const toDelete = [...this.selectedPhotosFilenames]
      for (const filename of toDelete) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/delete`, {})
        if (error.value) {
          triggerAlert('error', 'Delete error', error.value)
        } else if (data.value && data.value.ERROR) {
          triggerAlert('error', data.value.message, data.value.details)
        } else {
          this.photos = this.photos.filter(p => p.filename !== filename)
          this.selectedPhotosFilenames = this.selectedPhotosFilenames.filter(f => f !== filename)
        }
      }
      this.doGetPhotos()
    },

    async publishSelected() {
      this.loading = true
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost('/api/publish', { photos: this.selectedPhotosFilenames })
      if (error.value) {
        triggerAlert('error', 'Publish error', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      }
      this.selectedPhotosFilenames = []
      this.doGetPhotos()
      this.loading = false
    },

    async doGetPhotos() {
      const { triggerAlert } = useAlertStore()
      const appConfig = useAppConfigStore()
      const limit = appConfig.galleryLimit(this.sharedDatas.isMobile)
      const { data, error } = await useAsyncFetch(`/api/unpublished?sort_by=${this.sortBy}&sort_dir=${this.sortDir}&limit=${limit}&tag_filter=${this.tagFilter}`)
      if (error.value) {
        triggerAlert('error', 'Request failure', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.paths = data.value.data.paths
        this.photos = data.value.data.photos
        this.total = data.value.data.total ?? this.photos.length
      }
    },
  },
}
</script>


<style scoped>
.no-tags-chip {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.selection-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.selection-overlay.selected {
  background: rgba(var(--v-theme-primary), 0.45);
}
</style>
