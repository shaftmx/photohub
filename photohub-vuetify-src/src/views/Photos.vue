<template>
<DisplayPhoto
  ref="displayPhoto"
  :paths="paths"
  :photos="photos"
  :readonly="!authStore.canEdit"
  @photoDeleted="onPhotoDeleted"
  @photoUnpublished="onPhotoUnpublished"
></DisplayPhoto>

<TagPhotos
  ref="tagPhotos"
  :paths="paths"
  :allPhotos="photos"
  :selectedPhotosFilenames="selectedFilenames"
  @closed="onTagPhotosClosed"
></TagPhotos>

  <!-- Header -->
  <v-sheet v-if="displayed">
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

      <!-- Row 1: action buttons -->
      <template v-if="selectionMode && sharedDatas.isMobile">
        <!-- Mobile selection mode: 2 rows -->
        <v-sheet class="d-flex align-center mb-1 ma-0 pa-0">
          <span class="text-body-2 text-medium-emphasis">{{ selectedFilenames.length }} selected</span>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="tonal" size="small" density="compact"
            prepend-icon="mdi-close" @click="toggleSelectionMode()">Cancel</v-btn>
        </v-sheet>
        <v-sheet class="d-flex align-center justify-end ga-2 mb-2 ma-0 pa-0">
          <v-btn
            @click="selectedFilenames.length > 0 ? deselectAll() : selectAll()"
            size="small" color="secondary" variant="tonal" density="compact"
            :prepend-icon="selectedFilenames.length > 0 ? 'mdi-select-off' : 'mdi-select-all'"
          >{{ selectedFilenames.length > 0 ? 'Deselect all' : 'Select all' }}</v-btn>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" size="small" color="primary" variant="tonal"
                density="compact" append-icon="mdi-chevron-down" :disabled="selectedFilenames.length < 1">Actions</v-btn>
            </template>
            <v-list density="compact">
              <v-list-item @click="displayed = false; $refs.tagPhotos.open()">
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
      </template>
      <template v-else>
        <!-- Desktop / non-selection: single row -->
        <v-sheet class="d-flex mb-2 align-center">
          <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
          <v-sheet class="d-flex ma-0 pa-0 align-center ga-2">
            <template v-if="selectionMode">
              <span class="text-body-2 text-medium-emphasis">{{ selectedFilenames.length }} selected</span>
              <v-btn
                @click="selectedFilenames.length > 0 ? deselectAll() : selectAll()"
                color="secondary" variant="tonal" density="compact"
                :prepend-icon="selectedFilenames.length > 0 ? 'mdi-select-off' : 'mdi-select-all'"
              >{{ selectedFilenames.length > 0 ? 'Deselect all' : 'Select all' }}</v-btn>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" color="primary" variant="tonal"
                    density="compact" append-icon="mdi-chevron-down" :disabled="selectedFilenames.length < 1">Actions</v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item @click="displayed = false; $refs.tagPhotos.open()">
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
            </template>
            <v-btn v-if="authStore.canEdit && !selectionMode"
              prepend-icon="mdi-plus-box-outline"
              variant="tonal" color="primary" density="compact"
              :size="sharedDatas.isMobile ? 'small' : 'default'"
              @click="goToCreateView"
            >Save as view</v-btn>
            <v-btn v-if="authStore.canEdit"
              :color="selectionMode ? 'primary' : 'default'"
              :variant="selectionMode ? 'tonal' : 'outlined'"
              density="compact"
              :size="sharedDatas.isMobile ? 'small' : 'default'"
              :prepend-icon="selectionMode ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
              @click="toggleSelectionMode()"
            >{{ selectionMode ? 'Cancel' : 'Select' }}</v-btn>
          </v-sheet>
        </v-sheet>
      </template>

      <!-- Row 2: sort + photo count + grid size slider -->
      <v-sheet class="d-flex mb-2 align-center">
        <SortControls v-model:sortBy="sortBy" v-model:sortDir="sortDir" @update:sortBy="onSortChange()" @update:sortDir="onSortChange()"></SortControls>
        <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-end justify-end w-50">
          <v-slider v-model="sharedDatas.gridSize" style="max-width: 300px; width: 100%"
            :max="sharedDatas.gridMax" :min="sharedDatas.gridMin" hide-details color="primary"
            append-icon="mdi-image-size-select-actual" density="compact" track-size="2" thumb-size="15">
          </v-slider>
        </v-sheet>
      </v-sheet>
    </v-sheet>

    <!-- CONFIRM BULK UNPUBLISH -->
    <v-dialog v-model="confirmBulkUnpublishDialog" persistent width="auto">
      <v-card>
        <v-card-title class="text-h5">Unpublish {{ selectedFilenames.length }} photo{{ selectedFilenames.length > 1 ? 's' : '' }}?</v-card-title>
        <v-card-text>Selected photos will be moved back to unpublished and removed from the gallery.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" density="compact" variant="text" @click="confirmBulkUnpublishDialog = false">Cancel</v-btn>
          <v-btn color="warning" density="compact" variant="tonal" @click="confirmBulkUnpublishDialog = false; bulkUnpublish()">Unpublish</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CONFIRM BULK DELETE -->
    <v-dialog v-model="confirmBulkDeleteDialog" persistent width="auto">
      <v-card>
        <v-card-title class="text-h5">Delete {{ selectedFilenames.length }} photo{{ selectedFilenames.length > 1 ? 's' : '' }}?</v-card-title>
        <v-card-text>This will <strong>permanently delete</strong> the selected photos and their files. This cannot be undone.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" density="compact" variant="text" @click="confirmBulkDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" density="compact" variant="tonal" @click="confirmBulkDeleteDialog = false; bulkDelete()">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Filter bar -->
    <FilterBar
      :filter-tag-mode="filterTagMode"
      v-model:filterFavorite="filterFavorite"
      v-model:filterRating="filterRating"
      v-model:filterRatingMode="filterRatingMode"
      v-model:mediaType="mediaType"
      v-model:filterQuick="filterQuick"
      v-model:filterDetail="filterDetail"
      :available-tags-flat="availableTagsFlat"
      :tag-groups="tagGroupsFiltered"
      :photos="photos"
      :is-mobile="sharedDatas.isMobile"
      :show-tag-scope="true"
      v-model:showAllTags="showAllTags"
      :show-owner-filter="false"
      v-model:filterOwners="filterOwners"
      :available-owners="availableOwners"
      @update:filterTagMode="onFilterModeChange"
    />

    <PhotoGrid :photos="photos" :paths="paths" :shared-datas="sharedDatas" :show-favorite="!selectionMode && authStore.canEdit"
      @item-click="(photo, index, event) => selectionMode ? selectDeselect(photo, index, event) : $refs.displayPhoto.displayPhoto(photo.filename)"
      @toggle-favorite="toggleFavorite">
      <template #overlay="{ photo, index }">
        <div v-if="selectionMode" class="selection-overlay" :class="{ selected: selectedFilenames.includes(photo.filename) }" @click.stop="selectDeselect(photo, index, $event)">
          <v-icon v-if="selectedFilenames.includes(photo.filename)" color="white" size="28">mdi-check-circle</v-icon>
        </div>
      </template>
    </PhotoGrid>
  </v-sheet>
</template>

<script setup>
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import TagPhotos from '@/components/TagPhotos.vue'
import SortControls from '@/components/SortControls.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import FilterBar from '@/components/FilterBar.vue'
import PageTitle from '@/components/PageTitle.vue'
import { useAuthStore } from '../stores/auth.js'
import { useAppConfigStore } from '../stores/appConfig.js'
const authStore = useAuthStore()
</script>


<script>
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    displayed: true,
    title: "Photos",
    subtitle: "All photos that have been published",
    photos: [],         // Filtered photo list — updated on each filter change
    availableTags: [],  // All tags used on at least one published photo (from API, filter-independent)
    paths: {},
    sharedDatas: {},
    tags: [],
    tagGroups: [],
    loading: false,
    total: 0,
    // Selection mode
    selectionMode: false,
    selectedFilenames: [],
    lastSelectedIndex: null, // anchor for shift+click range selection
    confirmBulkDeleteDialog: false,
    confirmBulkUnpublishDialog: false,
    // Sort
    sortBy: 'date',
    sortDir: 'desc',
    // Filters
    filterTagMode: 'quick', // 'none' | 'quick' | 'detail' | 'notags'
    showAllTags: true,      // true = all published-photo tags / false = only tags in current selection
    filter: [], // This is the actual computed filters used and displayed as query parameter
    filterQuick: [], // This is used by quick filter
    filterDetail: {}, // This is used by filter display with tags
    filterFavorite: false, // If true, only show favorite photos
    filterRating: 0,       // 0 = no filter, 1-5 = filter by rating
    filterRatingMode: "lte", // lte = <= rating, eq = strictly equal
    mediaType: 'all',      // 'all' | 'photo' | 'video'
    // Owner filter (placeholder — hardcoded until backend support)
    filterOwners: [],
    availableOwners: ['user1', 'user2'],
  }),

  computed: {
    filterMode() {
      if (this.filterTagMode === 'none') return 'none'
      if (this.filterTagMode === 'quick') return 'basic'
      if (this.filterTagMode === 'detail') return 'smart'
      return 'notags'
    },

    availableTagsFlat() {
      if (this.showAllTags) return this.availableTags
      const names = new Set()
      this.photos.forEach(photo => {
        Object.values(photo.tags || {}).forEach(tagList => {
          tagList.forEach(tagName => names.add(tagName))
        })
      })
      return this.availableTags.filter(tag => names.has(tag.name))
    },

    tagGroupsFiltered() {
      const availableNames = new Set(this.availableTags.map(t => t.name))
      return this.tagGroups
        .map(group => ({
          ...group,
          tags: group.tags.filter(tag => availableNames.has(tag.name)),
        }))
        .filter(group => group.tags.length > 0)
    },
  },

  async mounted() {
    requireAuth(this)
    await useAppConfigStore().load()
    this.sharedDatas = getSharedDatas(this)
    this.init()
  },

  watch: {
    "filterDetail": {
      handler: function (newfilter, oldfilter) {
        console.log("--watch filterDetail")
        console.log(newfilter)

        let filter = []
        for (const [group, tags] of Object.entries(newfilter)) {
          tags.forEach((tag) => {
            filter.push(tag.name);
          })
        }

        this.filter = filter
      },
      deep: true,
    },

    "filterQuick"(newfilter, oldfilter) {
      console.log("--watch filterQuick")
      this.filter = newfilter.map((x) => x.name);
    },

    "filter"() {
      this.syncUrl()
      this.doGetPhotos()
    },

    "filterFavorite"() {
      this.syncUrl()
      this.doGetPhotos()
    },

    "filterRating"() {
      this.syncUrl()
      this.doGetPhotos()
    },

    "filterRatingMode"() {
      this.syncUrl()
      if (this.filterRating > 0) this.doGetPhotos()
    },

    "filterTagMode"() {
      this.syncUrl()
      this.doGetPhotos()
    },

    "mediaType"() {
      this.syncUrl()
      this.doGetPhotos()
    },
  },

  methods: {
    goToCreateView() {
      const tagNames = this.filter.slice()
      this.$router.push({
        name: 'view-create',
        state: {
          filterConfig: {
            filter_mode: this.filterMode,       // none / basic / smart / notags
            filter_tag_names: tagNames,
            filter_favorite: this.filterFavorite ? true : null,
            filter_rating_value: this.filterRating,
            filter_rating_mode: this.filterRatingMode,
            filter_media_type: this.mediaType,
          },
        },
      })
    },

    toggleSelectionMode() {
      this.selectionMode = !this.selectionMode
      if (!this.selectionMode) { this.selectedFilenames = []; this.lastSelectedIndex = null }
    },

    selectDeselect(photo, index, event) {
      // Shift+click: select/deselect the range between last clicked and current
      if (event?.shiftKey && this.lastSelectedIndex !== null) {
        const from = Math.min(this.lastSelectedIndex, index)
        const to = Math.max(this.lastSelectedIndex, index)
        const rangeFilenames = this.photos.slice(from, to + 1).map(p => p.filename)
        // If all photos in range are already selected → deselect the range, otherwise select all
        const allSelected = rangeFilenames.every(f => this.selectedFilenames.includes(f))
        if (allSelected) {
          this.selectedFilenames = this.selectedFilenames.filter(f => !rangeFilenames.includes(f))
        } else {
          rangeFilenames.forEach(f => { if (!this.selectedFilenames.includes(f)) this.selectedFilenames.push(f) })
        }
      } else {
        // Normal click: toggle single photo, remember index as anchor for next shift+click
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

    async bulkDelete() {
      const { triggerAlert } = useAlertStore()
      const toDelete = [...this.selectedFilenames]
      for (const filename of toDelete) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/delete`, {})
        if (error.value) {
          triggerAlert('error', 'Delete error', error.value)
        } else if (data.value && data.value.ERROR) {
          triggerAlert('error', data.value.message, data.value.details)
        } else {
          this.photos = this.photos.filter(p => p.filename !== filename)
          this.selectedFilenames = this.selectedFilenames.filter(f => f !== filename)
        }
      }
      this.toggleSelectionMode()
      this.doGetPhotos()
    },

    async bulkUnpublish() {
      const { triggerAlert } = useAlertStore()
      const toUnpublish = [...this.selectedFilenames]
      for (const filename of toUnpublish) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/unpublish`, {})
        if (error.value) {
          triggerAlert('error', 'Unpublish error', error.value)
        } else if (data.value && data.value.ERROR) {
          triggerAlert('error', data.value.message, data.value.details)
        } else {
          this.photos = this.photos.filter(p => p.filename !== filename)
          this.selectedFilenames = this.selectedFilenames.filter(f => f !== filename)
        }
      }
      this.toggleSelectionMode()
      this.doGetPhotos()
    },

    async bulkSetFavorite(newValue) {
      const { triggerAlert } = useAlertStore()
      for (const filename of this.selectedFilenames) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/update`, { favorite: newValue })
        if (error.value) {
          triggerAlert('error', 'Save error', error.value)
        } else if (data.value && data.value.ERROR) {
          triggerAlert('error', data.value.message, data.value.details)
        } else {
          const photo = this.photos.find(p => p.filename === filename)
          if (photo) photo.favorite = newValue
        }
      }
      this.toggleSelectionMode()
      this.doGetPhotos()
    },

    onTagPhotosClosed() {
      this.displayed = true
      this.selectionMode = false
      this.doGetPhotos()
    },

    onFilterModeChange(value) {
      if (value === null) return
      if (value === this.filterTagMode) return

      if (value === 'none' || value === 'notags') {
        this.filterQuick = []
        this.filterDetail = {}
        this.filter = []
        this.filterTagMode = value
      } else {
        const wasTagless = this.filterTagMode === 'notags' || this.filterTagMode === 'none'
        this.filterTagMode = value
        if (!wasTagless) this.syncFilters()
      }
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

    async init() {
      await this.doGetTags()

      const q = this.$route.query
      // Sort
      if (q.sort_by) this.sortBy = q.sort_by
      if (q.sort_dir) this.sortDir = q.sort_dir
      // Favorite & rating
      if (q.favorite === 'true') this.filterFavorite = true
      if (q.rating) {
        this.filterRating = parseInt(q.rating) || 0
        if (q.rating_mode) this.filterRatingMode = q.rating_mode
      }
      // Media type
      if (q.media_type && ['photo', 'video'].includes(q.media_type)) this.mediaType = q.media_type
      // Filter mode
      if (q.filter_mode) {
        const modeMap = { basic: 'quick', smart: 'detail', notags: 'notags', none: 'none' }
        this.filterTagMode = modeMap[q.filter_mode] || 'quick'
      }
      // Tags (only in quick/detail modes)
      if (q.tags && this.filterTagMode !== 'none' && this.filterTagMode !== 'notags') {
        const queryTags = q.tags.split(',')
        this.tags.forEach((tag) => {
          if (queryTags.includes(tag.name)) {
            this.filterQuick.push(tag)
            this.filter.push(tag.name)
            if (!Object.keys(this.filterDetail).includes(tag.group_name)) {
              this.filterDetail[tag.group_name] = [{ ...tag }]
            } else {
              this.filterDetail[tag.group_name].push({ ...tag })
            }
          }
        })
      }
      await this.doGetPhotos()
    },

    syncUrl() {
      const q = {}
      // Filter mode (omit if quick with no tags = default)
      if (this.filterTagMode !== 'quick' || this.filter.length > 0) {
        q.filter_mode = this.filterMode
      }
      // Tags
      if (this.filter.length > 0 && this.filterTagMode !== 'none') {
        q.tags = this.filter.join(',')
      }
      // Favorite & rating
      if (this.filterFavorite) q.favorite = 'true'
      if (this.filterRating > 0) {
        q.rating = this.filterRating
        q.rating_mode = this.filterRatingMode
      }
      // Sort (omit defaults)
      if (this.sortBy !== 'date') q.sort_by = this.sortBy
      if (this.sortDir !== 'desc') q.sort_dir = this.sortDir
      // Media type (omit default 'all')
      if (this.mediaType !== 'all') q.media_type = this.mediaType
      this.$router.replace({ query: q })
    },

    onSortChange() {
      this.syncUrl()
      this.doGetPhotos()
    },

    syncFilters() {
      window.console.log("--syncFilters");

      if (this.filterTagMode === 'quick') {
        let filterQuick = []
        for (const [group, tags] of Object.entries(this.filterDetail)) {
          tags.forEach((tag) => {
            filterQuick.push({ ...tag });
          })
        }
        this.filterQuick = filterQuick
      } else {
        let filterDetail = {}
        this.filterQuick.forEach((tag) => {
          if (!Object.keys(filterDetail).includes(tag.group_name)) {
            filterDetail[tag.group_name] = [{ ...tag }];
          } else {
            filterDetail[tag.group_name].push({ ...tag });
          }
        })
        this.filterDetail = filterDetail
      }
    },

    async doGetPhotos() {
      window.console.log("--doGetPhotos");

      const params = {}

      if (this.filterTagMode === 'notags') {
        params.no_tags = 'true'
      } else if (this.filterTagMode !== 'none' && this.filter.length > 0) {
        params.tags = [this.filter]
        params.filter_mode = this.filterMode
      }

      if (this.filterFavorite) {
        params.favorite = 'true'
      }
      if (this.filterRating > 0) {
        params.rating = this.filterRating
        params.rating_mode = this.filterRatingMode
      }

      params.sort_by = this.sortBy
      params.sort_dir = this.sortDir
      if (this.mediaType !== 'all') params.media_type = this.mediaType

      const appConfig = useAppConfigStore()
      params.limit = appConfig.galleryLimit(this.sharedDatas.isMobile)

      const queryFilter = Object.keys(params).length > 0 ? "?" + new URLSearchParams(params) : ""

      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncFetch('/api/photos' + queryFilter)
      if (error.value) {
        triggerAlert("error", "Login failure", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      } else {
        this.paths = data.value.data.paths
        this.photos = data.value.data.photos
        this.total = data.value.data.total ?? this.photos.length
        this.availableTags = data.value.data.available_tags
      }
    },

    async doGetTags() {
      window.console.log("--doGetTags");
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncFetch('/api/tags')
      if (error.value) {
        triggerAlert("error", "Request failure", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      } else {
        this.tags = data.value.data.tags
        this.tagGroups = data.value.data.tag_groups
      }
    },
  },
}
</script>


<style scoped>

.selection-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.selection-overlay.selected {
  background: rgba(var(--v-theme-primary), 0.45);
}

.filter-panel {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.4);
}
</style>
