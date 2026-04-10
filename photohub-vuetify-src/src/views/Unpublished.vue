<template>
  <TagPhotos @closed="doGetPhotos(); displayed = true" ref="tagPhotos" :paths="paths" :allPhotos="photos"
    :selectedPhotosFilenames="selectedPhotosFilenames"></TagPhotos>

  <PhotoDetail ref="photoDetail" @deleted="onPhotoDeleted" @unpublished="onPhotoUnpublished" />

  <v-sheet v-if="displayed">

    <!-- Header -->
    <v-sheet>
      <v-sheet :class="!sharedDatas.isMobile ? 'ma-2 pa-2 me-auto' : ''">
        <h1 v-if="!sharedDatas.isMobile" class="text-h4 mb-4">{{ title }}</h1>
        <h1 v-if="!sharedDatas.isMobile" class="text-subtitle-1 mb-4">{{ subtitle }}</h1>
        <h1 v-if="sharedDatas.isMobile" class="text-h6 mb-1">{{ title }}</h1>
        <h1 v-if="sharedDatas.isMobile" class="text-body-2 mb-4">{{ subtitle }}</h1>
      </v-sheet>

      <!-- Row 1: selection controls + bulk actions menu -->
      <v-sheet class="d-flex mb-2">
        <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-center ga-2">
          <span class="text-body-2 text-medium-emphasis">{{ selectedPhotosFilenames.length }} selected</span>
          <v-btn
            @click="selectedPhotosFilenames.length === photos.length ? deselectAll() : selectAll()"
            :size="sharedDatas.isMobile ? 'small' : 'default'"
            color="secondary" variant="tonal" density="compact"
            :prepend-icon="selectedPhotosFilenames.length === photos.length ? 'mdi-select-off' : 'mdi-select-all'"
          >{{ selectedPhotosFilenames.length === photos.length ? 'Deselect all' : 'Select all' }}</v-btn>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" :size="sharedDatas.isMobile ? 'small' : 'default'" color="primary" variant="tonal"
                density="compact" append-icon="mdi-chevron-down" :disabled="selectedPhotosFilenames.length < 1">Actions</v-btn>
            </template>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-tag-arrow-right" @click="displayed = false; $refs.tagPhotos.open()">
                <v-list-item-title>Tag</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-cloud-check" @click="confirmPublishDialog = true; loading = true">
                <v-list-item-title>Publish</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item prepend-icon="mdi-delete" @click="confirmDeleteDialog = true" class="text-error">
                <v-list-item-title>Delete</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-sheet>
      </v-sheet>

      <!-- Row 2: sort + grid size slider -->
      <v-sheet class="d-flex mb-0 align-center">
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
    <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
      <div :style="'--ratio: ' + photo['height'] / photo['width'] + '; --height: ' + sharedDatas.gridSize" class="item"
        v-for="(photo) in photos">
        <div class="item-inner">
          <img :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']" />

          <!-- No-tags indicator -->
          <div v-if="Object.keys(photo['tags']).length === 0" class="no-tags-bar"></div>

          <!-- Selection overlay -->
          <div class="selection-overlay" :class="{ selected: selectedPhotosFilenames.includes(photo.filename) }"
            @click="selectDeselect(photo)">
            <v-icon v-if="selectedPhotosFilenames.includes(photo.filename)" color="white" size="28">mdi-check-circle</v-icon>
          </div>

          <!-- Detail button -->
          <button class="detail-btn ma-1" @click.stop="$refs.photoDetail.open(photo.filename)" title="Details">
            <v-icon size="16" color="white" style="opacity: 0.7;">mdi-information-outline</v-icon>
          </button>
        </div>
      </div>
      <div class="placeholder"></div>
    </v-container>
  </v-sheet>
</template>


<script setup>
import TagPhotos from '@/components/TagPhotos.vue'
import PhotoDetail from '@/views/PhotoDetail.vue'
import SortControls from '@/components/SortControls.vue'
</script>


<script>
import '../styles/galleryGrid.css'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
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
    selectedPhotosFilenames: [],
    paths: {},
    sharedDatas: {},
    loading: false,
    sortBy: 'date',
    sortDir: 'desc',
  }),

  mounted() {
    requireAuth(this)
    this.sharedDatas = getSharedDatas(this)
    this.doGetPhotos()
  },

  components: { TagPhotos, PhotoDetail },

  methods: {
    onPhotoDeleted(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
      this.selectedPhotosFilenames = this.selectedPhotosFilenames.filter(f => f !== filename)
    },

    onPhotoUnpublished(filename) {
      this.doGetPhotos()
    },

    selectDeselect(photo) {
      const idx = this.selectedPhotosFilenames.indexOf(photo.filename)
      if (idx === -1) this.selectedPhotosFilenames.push(photo.filename)
      else this.selectedPhotosFilenames.splice(idx, 1)
    },

    deselectAll() {
      this.selectedPhotosFilenames = []
    },

    selectAll() {
      this.selectedPhotosFilenames = this.photos.map(p => p.filename)
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
      const { data, error } = await useAsyncFetch(`/api/unpublished?sort_by=${this.sortBy}&sort_dir=${this.sortDir}`)
      if (error.value) {
        triggerAlert('error', 'Request failure', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.paths = data.value.data.paths
        this.photos = data.value.data.photos
      }
    },
  },
}
</script>


<style scoped>
.no-tags-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgb(var(--v-theme-error));
}

.detail-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
  background: rgba(var(--v-theme-primary), 0.35);
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}

@media (hover: hover) and (pointer: fine) {
  .item-inner:hover .detail-btn {
    opacity: 1;
  }
  .detail-btn:hover {
    background: rgba(var(--v-theme-primary), 0.75);
  }
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
