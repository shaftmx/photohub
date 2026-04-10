<template>
  <v-sheet class="pa-4">

    <!-- Header -->
    <v-sheet class="d-flex align-center mb-4 ga-2">
      <span class="text-h6">{{ isEditMode ? 'Edit view' : 'Create view' }}</span>
      <v-spacer></v-spacer>
      <v-btn variant="text" density="compact" @click="cancel">Cancel</v-btn>
      <v-btn color="primary" variant="tonal" density="compact" prepend-icon="mdi-check"
        :disabled="!name.trim() || saving" :loading="saving" @click="save">Save</v-btn>
    </v-sheet>

    <!-- View metadata -->
    <v-sheet class="d-flex flex-wrap ga-4 mb-4 align-start">
      <v-text-field
        v-model="name"
        label="Name"
        variant="outlined"
        density="compact"
        hide-details
        style="min-width: 220px; max-width: 360px"
        autofocus
      ></v-text-field>
      <v-textarea
        v-model="description"
        label="Description"
        placeholder="Optional — supports Markdown"
        variant="outlined"
        density="compact"
        hide-details
        rows="4"
        style="min-width: 280px; max-width: 560px"
      ></v-textarea>
      <v-switch
        v-model="isPublic"
        label="Public"
        color="primary"
        density="compact"
        hide-details
        class="mt-1"
      ></v-switch>
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
    <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
      <div
        v-for="photo in photos"
        :key="photo.filename"
        :style="'--ratio: ' + photo.height / photo.width + '; --height: ' + sharedDatas.gridSize"
        class="item"
      >
        <div class="item-inner">
          <img :src="paths[sharedDatas.gridPhotoSize] + '/' + photo.hash_path + '/' + photo.filename" />
        </div>
      </div>
      <div class="placeholder"></div>
    </v-container>

  </v-sheet>
</template>

<script setup>
import TagFilter from '@/components/TagFilter.vue'
import SortControls from '@/components/SortControls.vue'
</script>

<script>
import '../styles/galleryGrid.css'
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
