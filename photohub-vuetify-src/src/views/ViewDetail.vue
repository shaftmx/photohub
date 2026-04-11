<template>
  <DisplayPhoto
    ref="displayPhoto"
    :paths="paths"
    :photos="photos"
    :view-id="$route.params.id"
    :cover-filename="view.cover_filename"
    @photoDeleted="onPhotoDeleted"
    @photoUnpublished="onPhotoUnpublished"
  ></DisplayPhoto>

  <v-sheet class="pa-4" v-if="!loading">

    <!-- Header row -->
    <v-sheet class="d-flex align-center mb-2 ga-2">
      <span class="text-h6">{{ view.name }}</span>
      <span class="text-caption text-medium-emphasis">{{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }}</span>
      <v-chip size="x-small" :color="view.public ? 'success' : 'default'" variant="tonal">
        {{ view.public ? 'Public' : 'Private' }}
      </v-chip>
      <v-btn
        :icon="filtersOpen ? 'mdi-tag' : 'mdi-tag-outline'"
        :color="filtersOpen ? 'primary' : 'default'"
        variant="text" density="compact" size="small"
        title="Toggle filters"
        @click="filtersOpen = !filtersOpen"
      ></v-btn>
      <v-btn v-if="view.description"
        :icon="descriptionOpen ? 'mdi-text-box' : 'mdi-text-box-outline'"
        :color="descriptionOpen ? 'primary' : 'default'"
        variant="text" density="compact" size="small"
        :title="descriptionOpen ? 'Hide description' : 'Show description'"
        @click="descriptionOpen = !descriptionOpen"
      ></v-btn>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-pencil-outline" variant="text" density="compact" size="small"
        @click="$router.push({ name: 'view-edit', params: { id: $route.params.id } })"></v-btn>
      <v-btn icon="mdi-delete-outline" variant="text" density="compact" size="small" color="error"
        @click="confirmDeleteDialog = true"></v-btn>
    </v-sheet>

    <!-- Filter chips (collapsible) -->
    <v-expand-transition>
      <v-sheet v-if="filtersOpen" class="d-flex flex-wrap align-center ga-1 mb-2">
        <v-chip v-if="view.filter_mode === 'notags'" size="x-small" color="primary" variant="tonal" prepend-icon="mdi-tag-off-outline">No tags</v-chip>
        <v-chip v-if="view.filter_mode === 'basic'" size="x-small" variant="tonal" prepend-icon="mdi-text-search-variant">Quick</v-chip>
        <v-chip v-if="view.filter_mode === 'smart'" size="x-small" variant="tonal" prepend-icon="mdi-tag-search">Detailed</v-chip>
        <v-chip v-for="tag in view.filter_tags" :key="tag.name" size="x-small" :color="tag.color" variant="tonal">{{ tag.name }}</v-chip>
        <v-chip v-if="view.filter_favorite" size="x-small" color="red" variant="tonal" prepend-icon="mdi-heart">Favorites</v-chip>
        <v-chip v-if="view.filter_rating_value > 0" size="x-small" color="amber" variant="tonal" prepend-icon="mdi-star">
          {{ view.filter_rating_mode === 'eq' ? '=' : '≤' }}{{ view.filter_rating_value }}★
        </v-chip>
      </v-sheet>
    </v-expand-transition>

    <!-- Description (markdown, collapsible) -->
    <v-expand-transition>
      <div v-if="descriptionOpen && view.description">
        <v-divider class="mb-3"></v-divider>
        <div class="markdown-body text-body-2 mb-3" v-html="renderMarkdown(view.description)"></div>
        <v-divider class="mb-2"></v-divider>
      </div>
    </v-expand-transition>

    <!-- Sort + grid size slider -->
    <v-sheet class="d-flex align-center mb-2 ga-2">
      <SortControls v-model:sortBy="sortBy" v-model:sortDir="sortDir" @update:sortBy="applySort()" @update:sortDir="applySort()"></SortControls>
      <v-spacer></v-spacer>
      <v-sheet class="d-flex align-end justify-end" style="max-width: 300px; width: 50%">
        <v-slider v-model="sharedDatas.gridSize" :max="sharedDatas.gridMax" :min="sharedDatas.gridMin"
          hide-details color="primary" append-icon="mdi-image-size-select-actual"
          density="compact" track-size="2" thumb-size="15">
        </v-slider>
      </v-sheet>
    </v-sheet>

    <!-- Photo grid -->
    <PhotoGrid :photos="photos" :paths="paths" show-favorite
      @item-click="photo => $refs.displayPhoto.displayPhoto(photo.filename)"
      @toggle-favorite="toggleFavorite">
    </PhotoGrid>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="confirmDeleteDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>Delete "{{ view.name }}"?</v-card-title>
        <v-card-text>This will delete the view definition. Photos are not affected.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" density="compact" @click="confirmDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" density="compact" :loading="deleting" @click="deleteView">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-sheet>

  <v-sheet v-else class="d-flex justify-center pa-12">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </v-sheet>
</template>

<script setup>
import SortControls from '@/components/SortControls.vue'
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
</script>

<script>
import { marked } from 'marked'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    view: {},
    photos: [],
    paths: {},
    loading: true,
    deleting: false,
    sharedDatas: {},
    sortBy: 'date',
    sortDir: 'desc',
    filtersOpen: false,
    descriptionOpen: false,
    // Delete dialog
    confirmDeleteDialog: false,
  }),

  mounted() {
    requireAuth(this)
    this.sharedDatas = getSharedDatas(this)
    this.loadView()
  },

  methods: {
    renderMarkdown(text) {
      return marked.parse(text || '')
    },

    async loadView() {
      this.loading = true
      const id = this.$route.params.id
      const { data, error } = await useAsyncFetch(`/api/views/${id}/photos`)
      this.loading = false
      if (error.value) return
      this.view = data.value.data.view
      this.photos = data.value.data.photos
      this.paths = data.value.data.paths
      this.sortBy = this.view.sort_by
      this.sortDir = this.view.sort_dir
    },

    applySort() {
      const dir = this.sortDir === 'asc' ? 1 : -1
      const field = this.sortBy
      this.photos = [...this.photos].sort((a, b) => {
        if (a[field] < b[field]) return -1 * dir
        if (a[field] > b[field]) return 1 * dir
        return 0
      })
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

    onPhotoDeleted(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
    },

    onPhotoUnpublished(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
    },

    async deleteView() {
      this.deleting = true
      const id = this.$route.params.id
      await useAsyncPost(`/api/views/${id}/delete`, {})
      this.deleting = false
      this.$router.push({ name: 'Views' })
    },
  },
}
</script>

<style scoped>
.markdown-body :deep(p) { margin: 0 0 6px; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) { margin: 8px 0 4px; font-weight: 600; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { margin: 4px 0; padding-left: 20px; }
.markdown-body :deep(li) { margin: 2px 0; }
.markdown-body :deep(code) { background: rgba(0,0,0,0.07); border-radius: 3px; padding: 1px 4px; font-size: 0.85em; }
.markdown-body :deep(a) { color: rgb(var(--v-theme-primary)); }

</style>
