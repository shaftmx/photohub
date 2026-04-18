<template>
  <TagPhotos ref="tagPhotos" @closed="fetchPreview(); tagPhotosVisible = true"
    :paths="paths" :allPhotos="photos" :selectedPhotosFilenames="selectedFilenames">
  </TagPhotos>

  <DisplayPhoto
    ref="displayPhoto"
    :photos="photos"
    :paths="paths"
    :view-id="isEditMode ? $route.params.id : null"
    :cover-filename="coverFilename"
    @photoDeleted="onPhotoDeleted"
    @photoUnpublished="onPhotoUnpublished"
  />

  <v-sheet v-if="tagPhotosVisible" class="pa-4">

    <!-- Header -->
    <v-sheet class="d-flex align-center mb-4 ga-2">
      <span class="text-h6">{{ isEditMode ? 'Edit view' : 'Create view' }}</span>
      <v-spacer></v-spacer>
      <v-btn variant="text" density="compact" @click="cancel">Cancel</v-btn>
      <v-btn color="primary" variant="tonal" density="compact" prepend-icon="mdi-check"
        :disabled="!name.trim() || saving" :loading="saving" @click="save">Save</v-btn>
    </v-sheet>

    <!-- Row 1: name + public + cover -->
    <v-sheet class="d-flex flex-wrap ga-3 align-center mb-3">
      <v-text-field
        v-model="name"
        label="Name"
        variant="outlined"
        density="compact"
        hide-details
        style="min-width: 220px; max-width: 360px"
        autofocus
      ></v-text-field>
      <v-switch
        v-model="isPublic"
        label="Public"
        color="primary"
        density="compact"
        hide-details
      ></v-switch>
      <div v-if="isEditMode && coverFilename" class="d-inline-flex align-center ga-2 pa-1 rounded border" style="width: fit-content">
        <v-img
          v-if="paths[sharedDatas.gridPhotoSize]"
          :src="paths[sharedDatas.gridPhotoSize] + '/' + coverHashPath + '/' + coverFilename.replace(/\.[^.]+$/, '.jpg')"
          width="40" height="40" cover class="rounded flex-shrink-0"
        ></v-img>
        <span class="text-caption text-medium-emphasis">Cover</span>
        <v-btn icon size="x-small" variant="text" color="error" @click="coverFilename = null" title="Remove cover">
          <v-icon size="16">mdi-close</v-icon>
        </v-btn>
      </div>
    </v-sheet>

    <!-- Row 2: description -->
    <v-sheet class="mb-3">
      <v-textarea
        v-model="description"
        label="Description"
        placeholder="Optional — supports Markdown"
        variant="outlined"
        density="compact"
        hide-details
        rows="3"
        style="max-width: 560px"
      ></v-textarea>
    </v-sheet>

    <!-- Row 3: sort + drag mode controls -->
    <v-sheet class="mb-3 d-flex flex-wrap align-center ga-2">
      <!-- Sort controls: disabled in drag mode; 'custom' option only if custom order exists or being created -->
      <SortControls
        v-model:sortBy="sortBy"
        v-model:sortDir="sortDir"
        :show-custom-order="hasCustomOrder"
        :disabled="dragMode"
        @update:sortBy="onSortByChange"
        @update:sortDir="fetchPreview()"
      ></SortControls>

      <v-divider vertical class="mx-1"></v-divider>

      <!-- State A / A': "Custom order" button -->
      <v-btn v-if="sortBy !== 'custom' && !dragMode"
        prepend-icon="mdi-drag-variant"
        variant="tonal"
        density="compact"
        size="small"
        :disabled="hasCustomOrder"
        @click="createCustomOrder"
      >Custom order
        <v-tooltip v-if="hasCustomOrder" activator="parent" location="top">
          A custom order already exists — select "Custom order" in the sort menu to edit it
        </v-tooltip>
      </v-btn>

      <!-- State B: Reorder + Delete order -->
      <template v-if="sortBy === 'custom' && !dragMode">
        <v-btn
          prepend-icon="mdi-cursor-move"
          variant="tonal"
          density="compact"
          size="small"
          @click="enterDragMode"
        >Reorder</v-btn>
        <v-btn
          icon="mdi-sort-variant-remove"
          variant="text"
          density="compact"
          size="small"
          color="primary"
          title="Delete custom order"
          @click="deleteCustomOrder"
        ></v-btn>
      </template>

      <!-- State C: Done + Cancel -->
      <template v-if="dragMode">
        <v-btn
          prepend-icon="mdi-check"
          variant="tonal"
          color="primary"
          density="compact"
          size="small"
          :loading="savingOrder"
          @click="exitDragMode"
        >Done</v-btn>
        <v-btn
          variant="text"
          density="compact"
          size="small"
          @click="cancelReorder"
        >Cancel</v-btn>
      </template>
    </v-sheet>

    <!-- Filter bar -->
    <v-sheet class="mb-3">
      <div class="d-flex flex-wrap align-center ga-2" :class="(filterTagMode === 'quick' || (filterTagMode === 'detail' && filterPanelOpen)) ? 'mb-1' : 'mb-0'">
        <FilterModeToggle
          v-model="filterTagMode"
          @update:modelValue="onFilterModeChange"
        ></FilterModeToggle>

        <v-divider vertical style="height: 24px; align-self: center;"></v-divider>

        <!-- Media type filter -->
        <v-btn-toggle v-model="filterMediaType" mandatory density="compact" rounded="lg" style="height:28px;" @update:modelValue="fetchPreview()">
          <v-btn value="all" size="x-small" variant="text">All</v-btn>
          <v-btn value="photo" size="x-small" variant="text"><v-icon size="14">mdi-image</v-icon></v-btn>
          <v-btn value="video" size="x-small" variant="text"><v-icon size="14">mdi-video</v-icon></v-btn>
        </v-btn-toggle>

        <!-- Favorite filter toggle -->
        <v-btn
          :icon="filterFavorite ? 'mdi-heart' : 'mdi-heart-outline'"
          :color="filterFavorite ? 'red' : 'default'"
          :variant="filterFavorite ? 'tonal' : 'text'"
          density="compact"
          size="small"
          :title="filterFavorite ? 'Favorites only — click to remove' : 'Filter by favorites'"
          @click="filterFavorite = !filterFavorite; fetchPreview()"
        ></v-btn>

        <!-- Rating filter -->
        <div class="d-flex align-center">
          <v-btn
            v-for="star in 5"
            :key="star"
            :icon="star <= filterRating ? 'mdi-star' : 'mdi-star-outline'"
            :color="star <= filterRating ? 'amber' : 'default'"
            variant="text"
            density="compact"
            size="x-small"
            @click="filterRating = star === filterRating ? 0 : star; fetchPreview()"
            :title="star + ' star' + (star > 1 ? 's' : '')"
          ></v-btn>
          <span
            v-if="filterRating > 0"
            class="text-primary font-weight-bold"
            style="cursor: pointer; font-size: 13px; padding: 0 2px"
            title="Toggle: <= rating or exactly equal"
            @click="filterRatingMode = filterRatingMode === 'lte' ? 'eq' : 'lte'; fetchPreview()"
          >{{ filterRatingMode === 'lte' ? '≤' : '=' }}</span>
        </div>

        <!-- Collapse toggle for detailed mode -->
        <v-btn
          v-if="filterTagMode === 'detail'"
          :append-icon="filterPanelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          variant="tonal"
          color="primary"
          density="compact"
          size="small"
          class="ml-2"
          @click="filterPanelOpen = !filterPanelOpen"
        >{{ filterPanelOpen ? 'Hide filters' : 'Show filters' }}</v-btn>
      </div>

      <!-- Quick filter: tag autocomplete -->
      <v-autocomplete v-if="filterTagMode === 'quick'"
        prepend-icon="mdi-text-search-variant"
        return-object
        closable-chips
        v-model="filterQuick"
        item-title="name"
        :items="allTagsFlat"
        chips clearable multiple density="compact"
        direction="horizontal"
        variant="solo-inverted"
        @update:model-value="fetchPreview()"
      ></v-autocomplete>

      <!-- Detailed filter panel -->
      <v-expand-transition>
        <div v-if="filterTagMode === 'detail' && filterPanelOpen" class="filter-panel pl-3 mt-1">
          <TagFilter
            v-model="filterDetail"
            :tag-groups="tagGroups"
            :photos="[]"
            :show-all="true"
          />
        </div>
      </v-expand-transition>
    </v-sheet>

    <!-- Preview header -->
    <v-sheet class="d-flex align-center mb-2">
      <span class="text-body-2 text-medium-emphasis">
        {{ loading ? 'Loading…' : photos.length + ' photo' + (photos.length !== 1 ? 's' : '') + ' match' }}
      </span>
      <v-spacer></v-spacer>
      <v-sheet class="d-flex align-end justify-end" style="max-width: 240px; width: 40%">
        <v-slider v-model="sharedDatas.gridSize" :max="sharedDatas.gridMax" :min="sharedDatas.gridMin"
          hide-details color="primary" append-icon="mdi-image-size-select-actual"
          density="compact" track-size="2" thumb-size="15">
        </v-slider>
      </v-sheet>
    </v-sheet>

    <!-- Delete custom order confirm dialog -->
    <v-dialog v-model="confirmDeleteOrderDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>Delete custom order?</v-card-title>
        <v-card-text>The custom order will be removed and photos will be sorted by default order.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" density="compact" @click="confirmDeleteOrderDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" density="compact" :loading="deletingOrder" @click="confirmDeleteCustomOrder">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bulk selection controls (hidden in drag mode) -->
    <v-sheet v-if="!dragMode" class="d-flex mb-2 align-center ga-2">
      <span class="text-body-2 text-medium-emphasis">{{ selectedFilenames.length }} selected</span>
      <v-btn
        @click="selectedFilenames.length > 0 ? deselectAll() : selectAll()"
        size="small" color="secondary" variant="tonal" density="compact"
        :prepend-icon="selectedFilenames.length > 0 ? 'mdi-select-off' : 'mdi-select-all'"
      >{{ selectedFilenames.length > 0 ? 'Deselect all' : 'Select all' }}</v-btn>
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" size="small" color="primary" variant="tonal" density="compact"
            append-icon="mdi-chevron-down" :disabled="selectedFilenames.length < 1">Actions</v-btn>
        </template>
        <v-list density="compact">
          <v-list-item @click="openBulkTag">
            <template #prepend><v-icon color="primary" class="mr-4">mdi-tag-arrow-right</v-icon></template>
            <v-list-item-title>Tag</v-list-item-title>
          </v-list-item>
          <v-list-item @click="bulkSetFavorite(true)">
            <template #prepend><v-icon color="red" class="mr-4">mdi-heart</v-icon></template>
            <v-list-item-title>Add to favorites</v-list-item-title>
          </v-list-item>
          <v-list-item @click="bulkSetFavorite(false)">
            <template #prepend><v-icon class="mr-4">mdi-heart-off-outline</v-icon></template>
            <v-list-item-title>Remove from favorites</v-list-item-title>
          </v-list-item>
          <v-list-item @click="confirmBulkUnpublishDialog = true">
            <template #prepend><v-icon class="mr-4">mdi-cloud-off-outline</v-icon></template>
            <v-list-item-title>Unpublish</v-list-item-title>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item @click="confirmBulkDeleteDialog = true">
            <template #prepend><v-icon color="error" class="mr-4">mdi-delete</v-icon></template>
            <v-list-item-title>Delete</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-sheet>

    <!-- Confirm bulk unpublish -->
    <v-dialog v-model="confirmBulkUnpublishDialog" persistent width="auto">
      <v-card>
        <v-card-title class="text-h5">Unpublish {{ selectedFilenames.length }} photo{{ selectedFilenames.length !== 1 ? 's' : '' }}?</v-card-title>
        <v-card-text>Selected photos will be moved back to Unpublished.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" density="compact" variant="text" @click="confirmBulkUnpublishDialog = false">Cancel</v-btn>
          <v-btn color="primary" density="compact" variant="tonal" @click="confirmBulkUnpublishDialog = false; bulkUnpublish()">Unpublish</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm bulk delete -->
    <v-dialog v-model="confirmBulkDeleteDialog" persistent width="auto">
      <v-card>
        <v-card-title class="text-h5">Delete {{ selectedFilenames.length }} photo{{ selectedFilenames.length !== 1 ? 's' : '' }}?</v-card-title>
        <v-card-text>This will <strong>permanently delete</strong> the selected photos. This cannot be undone.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" density="compact" variant="text" @click="confirmBulkDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" density="compact" variant="tonal" @click="confirmBulkDeleteDialog = false; bulkDelete()">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Preview grid -->
    <PhotoGrid :photos="photos" :paths="paths" :shared-datas="sharedDatas" show-favorite show-cover :cover-filename="coverFilename"
      :draggable="dragMode"
      @item-click="(photo, index, event) => dragMode ? null : selectDeselect(photo, index, event)"
      @toggle-favorite="toggleFavorite"
      @set-cover="setCover"
      @reorder="onReorder">
      <template #overlay="{ photo, index }">
        <div class="selection-overlay" :class="{ selected: selectedFilenames.includes(photo.filename) }"
          @click.stop="selectDeselect(photo, index, $event)">
          <v-icon v-if="selectedFilenames.includes(photo.filename)" color="white" size="28">mdi-check-circle</v-icon>
        </div>
        <button class="detail-btn" @click.stop="$refs.displayPhoto.displayPhoto(photo.filename)" title="Details">
          <v-icon size="18">mdi-information-outline</v-icon>
        </button>
      </template>
    </PhotoGrid>

  </v-sheet>
</template>

<script setup>
import TagFilter from '@/components/TagFilter.vue'
import TagPhotos from '@/components/TagPhotos.vue'
import SortControls from '@/components/SortControls.vue'
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import FilterModeToggle from '@/components/FilterModeToggle.vue'
</script>

<script>
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    // View metadata
    name: '',
    description: '',
    isPublic: false,
    saving: false,
    sortBy: 'date',
    sortDir: 'desc',
    // Tags data
    allTagsFlat: [],   // flat list of all tags for quick filter
    tagGroups: [],     // grouped for detail filter
    paths: {},
    sharedDatas: {},
    // Filters
    filterTagMode: 'quick',  // quick / detail / notags
    filterPanelOpen: false,
    filterQuick: [],
    filterDetail: {},
    filterFavorite: false,
    filterRating: 0,
    filterRatingMode: 'lte',
    filterMediaType: 'all',
    // Preview
    photos: [],
    loading: false,
    // Cover (edit mode)
    coverFilename: null,
    coverHashPath: null,
    // Custom order (edit mode)
    dragMode: false,
    savingOrder: false,
    confirmDeleteOrderDialog: false,
    deletingOrder: false,
    hasCustomOrder: false,      // local state (DB value + unsaved changes)
    dbHasCustomOrder: false,    // DB value only, for reset on filter change
    originalSortBy: 'date',     // sort_by to revert to on delete custom order
    localPhotoOrder: null,      // null = untouched, [] = clear, [filenames] = custom order
    preDragPhotos: [],          // snapshot for cancel
    preDragPhotoOrder: null,    // snapshot for cancel
    // Bulk selection
    selectedFilenames: [],
    lastSelectedIndex: null,
    confirmBulkDeleteDialog: false,
    confirmBulkUnpublishDialog: false,
    tagPhotosVisible: true,
  }),

  computed: {
    isEditMode() {
      return !!this.$route.params.id
    },

    // Flat list of selected tag names (used for API call and saving)
    filterTagNames() {
      if (this.filterTagMode === 'quick') {
        return this.filterQuick.map(t => t.name)
      }
      const names = []
      Object.values(this.filterDetail).forEach(tags => tags.forEach(t => names.push(t.name)))
      return names
    },

    // API filter_mode param
    filterMode() {
      if (this.filterTagMode === 'none') return 'none'
      if (this.filterTagMode === 'quick') return 'basic'
      if (this.filterTagMode === 'detail') return 'smart'
      return 'notags'
    },
  },

  watch: {
    filterDetail: {
      handler() { this.fetchPreview() },
      deep: true,
    },
  },

  mounted() {
    requireAuth(this)
    this.sharedDatas = getSharedDatas(this)
    this.init()
  },

  methods: {
    async init() {
      await this.loadTags()
      if (this.isEditMode) {
        await this.loadView()
      } else {
        // Pre-fill from Photos.vue "Save as view" navigation state
        const state = history.state?.filterConfig
        if (state) {
          this._applyFilterState(state)
        }
      }
      await this.fetchPreview(false)
    },

    _applyFilterState(state) {
      const modeMap = { basic: 'quick', smart: 'detail', notags: 'notags', none: 'none' }
      this.filterTagMode = modeMap[state.filter_mode] || 'quick'
      this.filterFavorite = !!state.filter_favorite
      this.filterRating = state.filter_rating_value || 0
      this.filterRatingMode = state.filter_rating_mode || 'lte'
      this.filterMediaType = state.filter_media_type || 'all'
      if (state.filter_tag_names?.length) {
        const nameSet = new Set(state.filter_tag_names)
        const matched = this.allTagsFlat.filter(t => nameSet.has(t.name))
        this.filterQuick = matched
        matched.forEach(t => {
          if (!this.filterDetail[t.group_name]) this.filterDetail[t.group_name] = []
          this.filterDetail[t.group_name].push(t)
        })
      }
    },

    async loadView() {
      const id = this.$route.params.id
      const { data, error } = await useAsyncFetch(`/api/views/${id}`)
      if (error.value) return
      const v = data.value.data.view
      this.name = v.name
      this.description = v.description
      this.isPublic = v.public
      this.sortBy = v.sort_by
      this.sortDir = v.sort_dir
      this.hasCustomOrder = v.has_custom_order || false
      this.dbHasCustomOrder = v.has_custom_order || false
      this.originalSortBy = v.sort_by !== 'custom' ? v.sort_by : 'date'
      this.coverFilename = v.cover_filename || null
      this.coverHashPath = v.cover_hash_path || null
      this._applyFilterState({
        filter_mode: v.filter_mode,
        filter_tag_names: v.filter_tags.map(t => t.name),
        filter_favorite: v.filter_favorite,
        filter_rating_value: v.filter_rating_value,
        filter_rating_mode: v.filter_rating_mode,
        filter_media_type: v.filter_media_type || 'all',
      })
    },

    cancel() {
      if (this.isEditMode) {
        this.$router.push({ name: 'view-detail', params: { id: this.$route.params.id } })
      } else {
        this.$router.push({ name: 'Views' })
      }
    },

    async loadTags() {
      const { data, error } = await useAsyncFetch('/api/tags')
      if (error.value) return
      this.allTagsFlat = data.value.data.tags
      this.tagGroups = data.value.data.tag_groups
    },

    async fetchPreview(resetOrder = true) {
      if (resetOrder) {
        // Reset drag/order state when filters or sort change
        this.dragMode = false
        this.localPhotoOrder = null
        this.hasCustomOrder = this.dbHasCustomOrder
        this.deselectAll()
      }

      this.loading = true
      const params = new URLSearchParams()
      if (this.filterTagMode === 'notags') {
        params.set('no_tags', 'true')
      } else if (this.filterTagMode !== 'none' && this.filterTagNames.length) {
        params.set('tags', this.filterTagNames.join(','))
        params.set('filter_mode', this.filterMode)
      }
      if (this.filterFavorite) params.set('favorite', 'true')
      if (this.filterRating > 0) {
        params.set('rating', this.filterRating)
        params.set('rating_mode', this.filterRatingMode)
      }
      if (this.filterMediaType !== 'all') params.set('media_type', this.filterMediaType)

      // In edit mode with an existing custom order selected, load from the view endpoint
      // so the preview reflects the saved order (the photos API doesn't know about ViewPhotoOrder).
      const id = this.$route.params.id
      let fetchUrl
      if (this.isEditMode && this.dbHasCustomOrder && this.sortBy === 'custom') {
        fetchUrl = `/api/views/${id}/photos?sort_by=custom`
      } else {
        params.set('sort_by', this.sortBy)
        params.set('sort_dir', this.sortDir)
        fetchUrl = '/api/photos?' + params.toString()
      }

      const { data, error } = await useAsyncFetch(fetchUrl)
      this.loading = false
      if (error.value) return
      this.photos = data.value.data.photos
      this.paths = data.value.data.paths
    },

    onGridItemClick(photo) {
      this.$refs.displayPhoto.displayPhoto(photo.filename)
    },

    selectDeselect(photo, index, event) {
      if (event?.shiftKey && this.lastSelectedIndex !== null) {
        const from = Math.min(this.lastSelectedIndex, index)
        const to = Math.max(this.lastSelectedIndex, index)
        const range = this.photos.slice(from, to + 1).map(p => p.filename)
        const allSelected = range.every(f => this.selectedFilenames.includes(f))
        if (allSelected) {
          this.selectedFilenames = this.selectedFilenames.filter(f => !range.includes(f))
        } else {
          range.forEach(f => { if (!this.selectedFilenames.includes(f)) this.selectedFilenames.push(f) })
        }
      } else {
        const idx = this.selectedFilenames.indexOf(photo.filename)
        if (idx === -1) this.selectedFilenames.push(photo.filename)
        else this.selectedFilenames.splice(idx, 1)
        this.lastSelectedIndex = index ?? null
      }
    },

    selectAll() {
      this.selectedFilenames = this.photos.map(p => p.filename)
    },

    deselectAll() {
      this.selectedFilenames = []
      this.lastSelectedIndex = null
    },

    openBulkTag() {
      this.tagPhotosVisible = false
      this.$nextTick(() => this.$refs.tagPhotos.open())
    },

    async bulkSetFavorite(newValue) {
      const { triggerAlert } = useAlertStore()
      for (const filename of this.selectedFilenames) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/update`, { favorite: newValue })
        if (error.value) {
          triggerAlert('error', 'Save error', error.value)
        } else if (data.value?.ERROR) {
          triggerAlert('error', data.value.message, data.value.details)
        } else {
          const photo = this.photos.find(p => p.filename === filename)
          if (photo) photo.favorite = newValue
        }
      }
      this.deselectAll()
    },

    async bulkUnpublish() {
      const { triggerAlert } = useAlertStore()
      for (const filename of [...this.selectedFilenames]) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/unpublish`, {})
        if (error.value) {
          triggerAlert('error', 'Unpublish error', error.value)
        } else if (data.value?.ERROR) {
          triggerAlert('error', data.value.message, data.value.details)
        } else {
          this.photos = this.photos.filter(p => p.filename !== filename)
        }
      }
      this.deselectAll()
    },

    async bulkDelete() {
      const { triggerAlert } = useAlertStore()
      for (const filename of [...this.selectedFilenames]) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/delete`, {})
        if (error.value) {
          triggerAlert('error', 'Delete error', error.value)
        } else if (data.value?.ERROR) {
          triggerAlert('error', data.value.message, data.value.details)
        } else {
          this.photos = this.photos.filter(p => p.filename !== filename)
        }
      }
      this.deselectAll()
    },

    onPhotoDeleted(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
    },

    onPhotoUnpublished(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
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

    setCover(photo) {
      const isCurrent = this.coverFilename === photo.filename
      this.coverFilename = isCurrent ? null : photo.filename
      this.coverHashPath = isCurrent ? null : photo.hash_path
    },

    onFilterModeChange(newMode) {
      if (newMode === 'none' || newMode === 'notags') {
        this.filterQuick = []
        this.filterDetail = {}
      }
      this.filterTagMode = newMode
      this.fetchPreview()
    },

    onSortByChange() {
      this.dragMode = false
      this.localPhotoOrder = null
      this.fetchPreview()
    },

    createCustomOrder() {
      // Seed custom order from current display order, switch directly to drag mode (State C)
      this.preDragPhotos = [...this.photos]
      this.preDragPhotoOrder = this.localPhotoOrder
      this.localPhotoOrder = this.photos.map(p => p.filename)
      this.hasCustomOrder = true
      this.sortBy = 'custom'
      this.dragMode = true
    },

    enterDragMode() {
      this.preDragPhotos = [...this.photos]
      this.preDragPhotoOrder = this.localPhotoOrder
      this.dragMode = true
    },

    async exitDragMode() {
      if (this.isEditMode && this.localPhotoOrder !== null) {
        const { triggerAlert } = useAlertStore()
        this.savingOrder = true
        const id = this.$route.params.id
        const { error } = await useAsyncPost(`/api/views/${id}/update`, {
          photo_order: this.localPhotoOrder,
          sort_by: 'custom',
        })
        this.savingOrder = false
        if (error.value) {
          triggerAlert('error', 'Save error', error.value)
          return
        }
        this.dbHasCustomOrder = true
        this.sortBy = 'custom'
      }
      this.dragMode = false
    },

    cancelReorder() {
      this.photos = this.preDragPhotos
      this.localPhotoOrder = this.preDragPhotoOrder
      if (!this.preDragPhotoOrder && !this.dbHasCustomOrder) {
        this.hasCustomOrder = false
        this.sortBy = this.originalSortBy
      }
      this.dragMode = false
    },

    deleteCustomOrder() {
      this.confirmDeleteOrderDialog = true
    },

    async confirmDeleteCustomOrder() {
      const { triggerAlert } = useAlertStore()
      this.deletingOrder = true
      if (this.isEditMode) {
        const id = this.$route.params.id
        const { error } = await useAsyncPost(`/api/views/${id}/update`, { photo_order: [] })
        if (error.value) {
          triggerAlert('error', 'Save error', error.value)
          this.deletingOrder = false
          return
        }
        this.dbHasCustomOrder = false
      }
      this.deletingOrder = false
      this.confirmDeleteOrderDialog = false
      this.localPhotoOrder = null
      this.hasCustomOrder = false
      this.dragMode = false
      this.sortBy = this.originalSortBy
      this.fetchPreview(false)
    },

    onReorder(newPhotos) {
      this.photos = newPhotos
      this.localPhotoOrder = newPhotos.map(p => p.filename)
    },

    async save() {
      const { triggerAlert } = useAlertStore()
      this.saving = true

      const payload = {
        name: this.name.trim(),
        description: this.description,
        public: this.isPublic,
        filter_mode: this.filterMode,
        filter_tag_names: this.filterTagNames,
        filter_favorite: this.filterFavorite ? true : null,
        filter_rating_value: this.filterRating,
        filter_rating_mode: this.filterRatingMode,
        filter_media_type: this.filterMediaType,
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
      }
      payload.cover_filename = this.coverFilename
      if (this.localPhotoOrder !== null) {
        payload.photo_order = this.localPhotoOrder
      }

      const id = this.$route.params.id
      const url = this.isEditMode ? `/api/views/${id}/update` : '/api/views/create'
      const { data, error } = await useAsyncPost(url, payload)
      this.saving = false

      if (error.value) {
        triggerAlert('error', 'Save error', error.value)
        return
      }

      const viewId = this.isEditMode ? id : data.value.data.view.id
      this.$router.push({ name: 'view-detail', params: { id: viewId } })
    },
  },
}
</script>

<style scoped>
.filter-panel {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.4);
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
