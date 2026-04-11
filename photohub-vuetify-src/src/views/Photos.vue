<template>
<DisplayPhoto
  ref="displayPhoto"
  :paths="paths"
  :photos="photos"
  @photoDeleted="onPhotoDeleted"
  @photoUnpublished="onPhotoUnpublished"
></DisplayPhoto>

<TagPhotos
  ref="tagPhotos"
  :paths="paths"
  :allPhotos="photos"
  :selectedPhotosFilenames="selectedFilenames"
  @closed="displayed = true; selectionMode = false"
></TagPhotos>

  <!-- Header -->
  <v-sheet v-if="displayed">
    <v-sheet>
      <v-sheet :class="!sharedDatas.isMobile ? 'ma-2 pa-2 me-auto' : ''">
        <div v-if="!sharedDatas.isMobile" class="d-flex align-center ga-2 mb-1">
          <h1 class="text-h4">{{ title }}</h1>
          <span class="text-caption text-medium-emphasis">{{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }}</span>
        </div>
        <h1 v-if="!sharedDatas.isMobile" class="text-subtitle-1 mb-4">{{ subtitle }}</h1>
        <div v-if="sharedDatas.isMobile" class="d-flex align-center ga-2 mb-1">
          <h1 class="text-h6">{{ title }}</h1>
          <span class="text-caption text-medium-emphasis">{{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }}</span>
        </div>
        <h1 v-if="sharedDatas.isMobile" class="text-body-2 mb-4">{{ subtitle }}</h1>
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
            @click="selectedFilenames.length === photos.length ? deselectAll() : selectAll()"
            size="small" color="secondary" variant="tonal" density="compact"
            :prepend-icon="selectedFilenames.length === photos.length ? 'mdi-select-off' : 'mdi-select-all'"
          >{{ selectedFilenames.length === photos.length ? 'Deselect all' : 'Select all' }}</v-btn>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" size="small" color="primary" variant="tonal"
                density="compact" append-icon="mdi-chevron-down" :disabled="selectedFilenames.length < 1">Actions</v-btn>
            </template>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-tag-arrow-right" @click="displayed = false; $refs.tagPhotos.open()">
                <v-list-item-title>Tag</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-heart" @click="bulkSetFavorite(true)">
                <v-list-item-title>Add to favorites</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-heart-off-outline" @click="bulkSetFavorite(false)">
                <v-list-item-title>Remove from favorites</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-cloud-off-outline" @click="confirmBulkUnpublishDialog = true">
                <v-list-item-title>Unpublish</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item prepend-icon="mdi-delete" @click="confirmBulkDeleteDialog = true" class="text-error">
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
                @click="selectedFilenames.length === photos.length ? deselectAll() : selectAll()"
                color="secondary" variant="tonal" density="compact"
                :prepend-icon="selectedFilenames.length === photos.length ? 'mdi-select-off' : 'mdi-select-all'"
              >{{ selectedFilenames.length === photos.length ? 'Deselect all' : 'Select all' }}</v-btn>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" color="primary" variant="tonal"
                    density="compact" append-icon="mdi-chevron-down" :disabled="selectedFilenames.length < 1">Actions</v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-tag-arrow-right" @click="displayed = false; $refs.tagPhotos.open()">
                    <v-list-item-title>Tag</v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-heart" @click="bulkSetFavorite(true)">
                    <v-list-item-title>Add to favorites</v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-heart-off-outline" @click="bulkSetFavorite(false)">
                    <v-list-item-title>Remove from favorites</v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-cloud-off-outline" @click="confirmBulkUnpublishDialog = true">
                    <v-list-item-title>Unpublish</v-list-item-title>
                  </v-list-item>
                  <v-divider></v-divider>
                  <v-list-item prepend-icon="mdi-delete" @click="confirmBulkDeleteDialog = true" class="text-error">
                    <v-list-item-title>Delete</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </template>
            <v-btn
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

      <!-- Row 2: sort + grid size slider -->
      <v-sheet class="d-flex mb-2 align-center">
        <SortControls v-model:sortBy="sortBy" v-model:sortDir="sortDir" @update:sortBy="doGetPhotos()" @update:sortDir="doGetPhotos()"></SortControls>
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

    <!-- Filter bar: toggle + collapsible filter panel -->
    <v-sheet class="mb-2">
      <!-- Row 1: mode toggle + tag toggle + heart + rating + show filters -->
      <div class="d-flex flex-wrap align-center ga-2 mb-1">
        <v-btn-toggle
          :model-value="filterTagMode"
          @update:model-value="onFilterModeChange"
          density="compact"
          variant="outlined"
          color="primary"
          mandatory
        >
          <v-btn value="quick" size="small"><v-icon size="18">mdi-text-search-variant</v-icon><v-tooltip activator="parent" location="top">Quick filter</v-tooltip></v-btn>
          <v-btn value="detail" size="small"><v-icon size="18">mdi-tag-search</v-icon><v-tooltip activator="parent" location="top">Detailed filter</v-tooltip></v-btn>
          <v-btn value="notags" size="small"><v-icon size="18">mdi-tag-off-outline</v-icon><v-tooltip activator="parent" location="top">No tags</v-tooltip></v-btn>
        </v-btn-toggle>

        <!-- Toggle: all published tags vs tags in current selection (hidden in notags mode) -->
        <v-btn
          v-if="filterTagMode !== 'notags'"
          :icon="showAllTags ? 'mdi-tag-multiple' : 'mdi-tag-search'"
          :color="showAllTags ? 'primary' : 'default'"
          :variant="showAllTags ? 'tonal' : 'text'"
          density="compact"
          size="small"
          :title="showAllTags ? 'Showing all tags — click to show selection only' : 'Showing selection tags — click to show all'"
          @click="showAllTags = !showAllTags"
        ></v-btn>

        <v-divider vertical class="mx-1" style="height: 24px; align-self: center;"></v-divider>

        <!-- Favorite filter toggle -->
        <v-btn
          :icon="filterFavorite ? 'mdi-heart' : 'mdi-heart-outline'"
          :color="filterFavorite ? 'red' : 'default'"
          :variant="filterFavorite ? 'tonal' : 'text'"
          density="compact"
          size="small"
          :title="filterFavorite ? 'Favorites only — click to remove' : 'Filter by favorites'"
          @click="filterFavorite = !filterFavorite"
        ></v-btn>

        <!-- Rating filter: stars + operator toggle -->
        <div class="d-flex align-center">
          <v-btn
            v-for="star in 5"
            :key="star"
            :icon="star <= filterRating ? 'mdi-star' : 'mdi-star-outline'"
            :color="star <= filterRating ? 'amber' : 'default'"
            variant="text"
            density="compact"
            size="x-small"
            @click="filterRating = star === filterRating ? 0 : star"
            :title="star + ' star' + (star > 1 ? 's' : '')"
          ></v-btn>
          <span
            v-if="filterRating > 0"
            class="rating-mode-toggle text-primary font-weight-bold"
            title="Toggle: <= rating or exactly equal"
            @click="filterRatingMode = filterRatingMode === 'lte' ? 'eq' : 'lte'"
          >{{ filterRatingMode === 'lte' ? '≤' : '=' }}</span>
        </div>

        <!-- Collapse toggle — only for detailed mode, at the end -->
        <v-btn
          v-if="filterTagMode === 'detail'"
          :append-icon="filterPanelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          variant="text"
          density="compact"
          size="small"
          @click="filterPanelOpen = !filterPanelOpen"
        >{{ filterPanelOpen ? 'Hide filters' : 'Show filters' }}</v-btn>

        <!-- Save as view -->
        <v-btn
          class="ml-auto"
          prepend-icon="mdi-plus-box-outline"
          variant="tonal"
          color="primary"
          density="compact"
          size="small"
          @click="goToCreateView"
        >Save as view</v-btn>
      </div>

      <!-- Row 2: active tag chips summary (detailed mode, panel closed) -->
      <div v-if="filterTagMode === 'detail' && !filterPanelOpen && filter.length > 0" class="d-flex flex-wrap ga-1 mb-1">
        <v-chip v-for="tag in filter" :key="tag" size="x-small" color="primary" closable
          @click:close="removeDetailFilter(tag)">{{ tag }}</v-chip>
      </div>

      <!-- Quick filter: tag autocomplete -->
      <v-autocomplete v-if="filterTagMode === 'quick'" prepend-icon="mdi-text-search-variant" return-object closable-chips
        v-model="filterQuick" item-title="name" :items="availableTagsFlat" chips clearable multiple density="compact"
        direction="horizontal" variant="solo-inverted">
        <template v-slot:selection="{ attrs, items, select, selected }">
          <v-chip :color="tags[item].color" v-bind="attrs" :model-value="selected" closable @click="select"
            @click:close="remove(item)">
          </v-chip>
        </template>
      </v-autocomplete>

      <!-- Detailed filter — collapsible -->
      <v-expand-transition>
        <div v-if="filterTagMode === 'detail' && filterPanelOpen">
          <TagFilter
            v-model="filterDetail"
            :tag-groups="tagGroupsFiltered"
            :photos="showAllTags ? [] : photos"
            :show-all="showAllTags"
          />
        </div>
      </v-expand-transition>
    </v-sheet>

    <PhotoGrid :photos="photos" :paths="paths" :show-favorite="!selectionMode"
      @item-click="photo => selectionMode ? selectDeselect(photo) : $refs.displayPhoto.displayPhoto(photo.filename)"
      @toggle-favorite="toggleFavorite">
      <template #overlay="{ photo }">
        <div v-if="selectionMode" class="selection-overlay" :class="{ selected: selectedFilenames.includes(photo.filename) }" @click.stop="selectDeselect(photo)">
          <v-icon v-if="selectedFilenames.includes(photo.filename)" color="white" size="28">mdi-check-circle</v-icon>
        </div>
      </template>
    </PhotoGrid>
  </v-sheet>
</template>

<script setup>
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import TagFilter from '@/components/TagFilter.vue'
import TagPhotos from '@/components/TagPhotos.vue'
import SortControls from '@/components/SortControls.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
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
    // Selection mode
    selectionMode: false,
    selectedFilenames: [],
    confirmBulkDeleteDialog: false,
    confirmBulkUnpublishDialog: false,
    // Sort
    sortBy: 'date',
    sortDir: 'desc',
    // Filters
    filterTagMode: 'quick', // 'quick' | 'detail' | 'notags'
    filterPanelOpen: true,  // Detailed filter panel open/closed
    showAllTags: true,      // true = all published-photo tags / false = only tags in current selection
    filter: [], // This is the actual computed filters used and displayed as query parameter
    filterQuick: [], // This is used by quick filter
    filterDetail: {}, // This is used by filter display with tags
    filterFavorite: false, // If true, only show favorite photos
    filterRating: 0,       // 0 = no filter, 1-5 = filter by rating
    filterRatingMode: "lte", // lte = <= rating, eq = strictly equal
  }),

  computed: {
    filterMode() {
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

  mounted() {
    requireAuth(this)
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

    "filter"(newfilter, oldfilter) {
      console.log("--watch filter")
      this.$router.push(this.urlQueryTags(newfilter, this.filterMode))
      this.doGetPhotos()
    },

    "filterFavorite"() {
      this.doGetPhotos()
    },

    "filterRating"() {
      this.doGetPhotos()
    },

    "filterRatingMode"() {
      if (this.filterRating > 0) this.doGetPhotos()
    },

    "filterTagMode"(newMode, oldMode) {
      console.log("--watch filterTagMode")
      this.$router.push(this.urlQueryTags(this.filter, this.filterMode))
      this.doGetPhotos()
    },
  },

  methods: {
    goToCreateView() {
      // Collect all selected tag names (from quick or detail mode)
      const tagNames = this.filter.slice()
      this.$router.push({
        name: 'view-create',
        state: {
          filterConfig: {
            filter_mode: this.filterMode,       // basic / smart / notags
            filter_tag_names: tagNames,
            filter_favorite: this.filterFavorite ? true : null,
            filter_rating_value: this.filterRating,
            filter_rating_mode: this.filterRatingMode,
          },
        },
      })
    },

    toggleSelectionMode() {
      this.selectionMode = !this.selectionMode
      if (!this.selectionMode) this.selectedFilenames = []
    },

    selectDeselect(photo) {
      const idx = this.selectedFilenames.indexOf(photo.filename)
      if (idx === -1) this.selectedFilenames.push(photo.filename)
      else this.selectedFilenames.splice(idx, 1)
    },

    selectAll() {
      this.selectedFilenames = this.photos.map(p => p.filename)
    },

    deselectAll() {
      this.selectedFilenames = []
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
    },

    removeDetailFilter(tagName) {
      const updated = {}
      for (const [group, tags] of Object.entries(this.filterDetail)) {
        const filtered = tags.filter(t => t.name !== tagName)
        if (filtered.length > 0) updated[group] = filtered
      }
      this.filterDetail = updated
    },

    onFilterModeChange(value) {
      if (value === null) return
      if (value === this.filterTagMode) return

      if (value === 'notags') {
        this.filterQuick = []
        this.filterDetail = {}
        this.filter = []
        this.filterTagMode = 'notags'
      } else {
        const wasNotags = this.filterTagMode === 'notags'
        this.filterTagMode = value
        if (!wasNotags) this.syncFilters()
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
      console.log("--init")
      await this.doGetTags()

      if (this.$route.query.tags) {
        const queryTags = this.$route.query.tags.split(",")
        this.tags.forEach((tag) => {
          if (queryTags.includes(tag.name)) {
            this.filterQuick.push(tag);
            this.filter.push(tag.name);
            if (!Object.keys(this.filterDetail).includes(tag.group_name)) {
              this.filterDetail[tag.group_name] = [{ ...tag }];
            } else {
              this.filterDetail[tag.group_name].push({ ...tag });
            }
          }
        })
      }
      if (this.$route.query.filter_mode) {
        const mode = this.$route.query.filter_mode
        if (mode === 'basic') this.filterTagMode = 'quick'
        else if (mode === 'notags') this.filterTagMode = 'notags'
        else this.filterTagMode = 'detail'
      }
      await this.doGetPhotos()
    },

    urlQueryTags(tags, filter_mode) {
      console.log("--urlQueryFilter")
      let q = { ...this.$route.query }
      if (tags != null) {
        q.tags = [tags]
      } else {
        delete q.tags
      }
      if (filter_mode != null) {
        q.filter_mode = filter_mode
      } else {
        delete q.filter_mode
      }
      return { query: q }
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
      } else if (this.filter.length > 0) {
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

.rating-mode-toggle {
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
  user-select: none;
}

.rating-mode-toggle:hover {
  opacity: 0.7;
}

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
</style>
