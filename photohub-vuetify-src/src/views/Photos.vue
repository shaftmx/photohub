<template>
<DisplayPhoto
  ref="displayPhoto"
  :paths="paths"
  :photos="photos"
  @photoDeleted="onPhotoDeleted"
  @photoUnpublished="onPhotoUnpublished"
></DisplayPhoto>

  <!-- Header -->
  <v-sheet>
    <v-sheet>
      <v-sheet :class="!sharedDatas.isMobile ? 'ma-2 pa-2 me-auto' : ''">
        <h1 v-if="!sharedDatas.isMobile" class="text-h4 mb-4">{{ title }}</h1>
        <h1 v-if="!sharedDatas.isMobile" class="text-subtitle-1 mb-4">{{ subtitle }}</h1>

        <h1 v-if="sharedDatas.isMobile" class="text-h6 mb-1">{{ title }}</h1>
        <h1 v-if="sharedDatas.isMobile" class="text-body-2 mb-4">{{ subtitle }}</h1>
      </v-sheet>

      <!-- Buttons: Tag, Publish, grid size slider -->
      <v-sheet class="d-flex mb-2 align-center">
        <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-center ga-2">
          <v-btn @click="displayed = false; $refs.tagPhotos.open()" color="primary" variant="tonal"
            :size="sharedDatas.isMobile ? 'small' : 'default'" density="compact" prepend-icon="mdi-tag-arrow-right"
            :disabled="false">Tag</v-btn>
          <v-btn @click="confirmPublishDialog = true; loading = true" color="primary" variant="flat"
            :size="sharedDatas.isMobile ? 'small' : 'default'" density="compact" prepend-icon="mdi-cloud-check"
            :loading="loading" :disabled="false">Publish</v-btn>
          <v-slider v-model="sharedDatas.gridSize" :style="sharedDatas.isMobile ? 'width: 120px' : 'width: 300px'" :max="sharedDatas.gridMax"
            :min="sharedDatas.gridMin" hide-details color="primary" append-icon="mdi-image-size-select-actual"
            density="compact" track-size="3" thumb-size="20">
          </v-slider>
        </v-sheet>
      </v-sheet>
    </v-sheet>

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
          <v-btn value="quick" prepend-icon="mdi-text-search-variant" size="small">Quick</v-btn>
          <v-btn value="detail" prepend-icon="mdi-tag-search" size="small">Detailed</v-btn>
          <v-btn value="notags" prepend-icon="mdi-tag-off-outline" size="small">No tags</v-btn>
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

    <!-- TODO check behavior when 0 pictures -->
    <!-- v-if="photos.length > 0" -->
    <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
      <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize" class="item"
        v-for="(photo) in photos">
        <div class="item-inner">
          <img @click="$refs.displayPhoto.displayPhoto(photo.filename)"
            :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']" />
          <!-- Favorite shortcut — visible on hover (desktop only) -->
          <button class="favorite-btn" :class="{ active: photo.favorite }" @click.stop="toggleFavorite(photo)" :title="photo.favorite ? 'Remove from favorites' : 'Add to favorites'">
            <v-icon size="18">{{ photo.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
          </button>
        </div>
      </div>
      <div class="placeholder"></div>
    </v-container>
  </v-sheet>
</template>

<script setup>
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import TagFilter from '@/components/TagFilter.vue'
</script>


<script>
import '../styles/galleryGrid.css'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    title: "Photos",
    subtitle: "All photos that have been published",
    photos: [],         // Filtered photo list — updated on each filter change
    availableTags: [],  // All tags used on at least one published photo (from API, filter-independent)
    paths: {},
    sharedDatas: {},
    tags: [],
    tagGroups: [],
    loading: false,
    filterTagMode: 'quick', // 'quick' | 'detail' | 'notags'
    filterPanelOpen: true,  // Detailed filter panel open/closed
    showAllTags: true,      // true = all published-photo tags / false = only tags in current selection
    // Filters will be synced using watch
    filter: [], // This is the actual computed filters used and displayed as query parameter
    filterQuick: [], // This is used by quick filter
    filterDetail: {}, // This is used by filter display with tags
    filterFavorite: false, // If true, only show favorite photos
    filterRating: 0,       // 0 = no filter, 1-5 = filter by rating
    filterRatingMode: "lte", // lte = <= rating, eq = strictly equal
  }),

  computed: {
    // Derives the API filter_mode param from filterTagMode
    filterMode() {
      if (this.filterTagMode === 'quick') return 'basic'
      if (this.filterTagMode === 'detail') return 'smart'
      return 'notags'
    },

    // Tags shown in the quick filter autocomplete.
    // showAllTags=true: all tags used on published photos (from API).
    // showAllTags=false: only tags present in the current filtered selection.
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

    // tagGroups filtered to only include tags present in availableTags (used on published photos).
    // This is the base for TagFilter — avoids showing DB tags never assigned to any photo.
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
      // Put filter in the url in order to be able to share it
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
      // Put filter in the url in order to be able to share it
      this.$router.push(this.urlQueryTags(this.filter, this.filterMode))
      this.doGetPhotos()
    },
  },

  methods: {
    // Remove a single tag from the detailed filter (used by summary chips when panel is closed)
    removeDetailFilter(tagName) {
      const updated = {}
      for (const [group, tags] of Object.entries(this.filterDetail)) {
        const filtered = tags.filter(t => t.name !== tagName)
        if (filtered.length > 0) updated[group] = filtered
      }
      this.filterDetail = updated
    },

    // Called when the filter mode toggle changes (quick / detailed / notags)
    onFilterModeChange(value) {
      if (value === null) return // prevent deselecting all buttons
      if (value === this.filterTagMode) return

      if (value === 'notags') {
        // Clear tag filters when switching to notags
        this.filterQuick = []
        this.filterDetail = {}
        this.filter = []
        this.filterTagMode = 'notags'
      } else {
        const wasNotags = this.filterTagMode === 'notags'
        this.filterTagMode = value
        if (!wasNotags) {
          // Sync filters between quick and detail only when switching between them
          this.syncFilters()
        }
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

    // Quand une photo est supprimée depuis le drawer de détail
    onPhotoDeleted(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
    },

    // Quand une photo est dépubliée depuis le drawer de détail
    onPhotoUnpublished(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
    },

    async init() {
      console.log("--init")
      // using init methode because some function require await of requests
      await this.doGetTags()

      if (this.$route.query.tags) {
        // get tags filter from the url query
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
      // ... mean deep copy
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
        // Switch to quick filter, so sync detailled -> quick
        let filterQuick = []
        for (const [group, tags] of Object.entries(this.filterDetail)) {
          tags.forEach((tag) => {
            filterQuick.push({ ...tag });
          })
        }
        this.filterQuick = filterQuick
      } else {
        // Switch to detailled, so sync quick -> detailled
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
      // Get alert store to be able to trigger some alert messages
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
</style>
