<template>
  <DisplayPhoto
    ref="displayPhoto"
    :photos="photos"
    :paths="paths"
    :view-id="isEditMode ? $route.params.id : null"
    :cover-filename="coverFilename"
    @photoDeleted="onPhotoDeleted"
    @photoUnpublished="onPhotoUnpublished"
  />

  <v-sheet class="pa-4">

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
          :src="paths[sharedDatas.gridPhotoSize] + '/' + coverHashPath + '/' + coverFilename"
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

    <!-- Row 3: sort -->
    <v-sheet class="mb-3">
      <SortControls v-model:sortBy="sortBy" v-model:sortDir="sortDir" @update:sortBy="fetchPreview()" @update:sortDir="fetchPreview()"></SortControls>
    </v-sheet>

    <!-- Filter bar -->
    <v-sheet class="mb-2">
      <div class="d-flex flex-wrap align-center ga-2 mb-1">
        <v-btn-toggle
          :model-value="filterTagMode"
          @update:model-value="onFilterModeChange"
          density="compact"
          variant="outlined"
          color="primary"
          mandatory
        >
          <v-btn value="quick" prepend-icon="mdi-text-search-variant" size="small">Quick</v-btn>
          <v-btn value="detail" prepend-icon="mdi-tag-search" size="small">Detailed</v-btn>
          <v-btn value="notags" prepend-icon="mdi-tag-off-outline" size="small">No tags</v-btn>
        </v-btn-toggle>

        <v-divider vertical class="mx-1" style="height: 24px; align-self: center;"></v-divider>

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
          variant="text"
          density="compact"
          size="small"
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

      <!-- Detailed filter -->
      <v-expand-transition>
        <div v-if="filterTagMode === 'detail' && filterPanelOpen">
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

    <!-- Preview grid -->
    <PhotoGrid :photos="photos" :paths="paths" show-favorite show-cover :cover-filename="coverFilename"
      @item-click="onGridItemClick"
      @toggle-favorite="toggleFavorite"
      @set-cover="setCover">
    </PhotoGrid>

  </v-sheet>
</template>

<script setup>
import TagFilter from '@/components/TagFilter.vue'
import SortControls from '@/components/SortControls.vue'
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
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
    filterPanelOpen: true,
    filterQuick: [],
    filterDetail: {},
    filterFavorite: false,
    filterRating: 0,
    filterRatingMode: 'lte',
    // Preview
    photos: [],
    loading: false,
    // Cover (edit mode)
    coverFilename: null,
    coverHashPath: null,
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
      await this.fetchPreview()
    },

    _applyFilterState(state) {
      const modeMap = { basic: 'quick', smart: 'detail', notags: 'notags' }
      this.filterTagMode = modeMap[state.filter_mode] || 'quick'
      this.filterFavorite = !!state.filter_favorite
      this.filterRating = state.filter_rating_value || 0
      this.filterRatingMode = state.filter_rating_mode || 'lte'
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
      this.coverFilename = v.cover_filename || null
      this.coverHashPath = v.cover_hash_path || null
      this._applyFilterState({
        filter_mode: v.filter_mode,
        filter_tag_names: v.filter_tags.map(t => t.name),
        filter_favorite: v.filter_favorite,
        filter_rating_value: v.filter_rating_value,
        filter_rating_mode: v.filter_rating_mode,
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

    async fetchPreview() {
      this.loading = true
      const params = new URLSearchParams()
      params.set('filter_mode', this.filterMode)
      if (this.filterMode !== 'notags' && this.filterTagNames.length) {
        params.set('tags', this.filterTagNames.join(','))
      }
      if (this.filterMode === 'notags') {
        params.set('no_tags', 'true')
      }
      if (this.filterFavorite) params.set('favorite', 'true')
      if (this.filterRating > 0) {
        params.set('rating', this.filterRating)
        params.set('rating_mode', this.filterRatingMode)
      }
      params.set('sort_by', this.sortBy)
      params.set('sort_dir', this.sortDir)

      const { data, error } = await useAsyncFetch('/api/photos?' + params.toString())
      this.loading = false
      if (error.value) return
      this.photos = data.value.data.photos
      this.paths = data.value.data.paths
    },

    onGridItemClick(photo) {
      this.$refs.displayPhoto.displayPhoto(photo.filename)
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
      this.filterTagMode = newMode
      this.fetchPreview()
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
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
      }
      payload.cover_filename = this.coverFilename

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
