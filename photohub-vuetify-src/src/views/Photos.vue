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

      <!-- Buttons -->
      <v-sheet class="d-flex mb-2">
        <v-sheet class="ma-0 pa-0 me-auto">
          <!-- Filters and buttons -->







          <v-switch @change="syncFilters()" hide-details v-model="displayQuickFilters" density="compact" color="secondary" false-icon="mdi-text-search-variant" true-icon="mdi-tag-search"
            label="Quick search filter" inset></v-switch>

        </v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-end justify-end w-50">
          <!-- BUTTON -->
          <v-btn @click="displayed = false; $refs.tagPhotos.open()" color="primary" variant="tonal" 
            :size="sharedDatas.isMobile ? 'small' : 'default'" density="compact" prepend-icon="mdi-tag-arrow-right"
            :disabled="false">Tag</v-btn>
          <!-- PUBLISH BUTTON -->
          <v-btn @click="confirmPublishDialog = true; loading = true" class="ml-2" color="primary" variant="flat"
            :size="sharedDatas.isMobile ? 'small' : 'default'" density="compact" prepend-icon="mdi-cloud-check"
            :loading="loading" :disabled="false">Publish</v-btn>
        </v-sheet>
      </v-sheet>



      <!-- Photo grid size selector -->
      <v-sheet class="d-flex mb-0">
        <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-end justify-end w-50">
          <v-slider v-model="sharedDatas.gridSize" style="max-width: 300px; width: 100%" :max="sharedDatas.gridMax"
            :min="sharedDatas.gridMin" hide-details color="primary" append-icon="mdi-image-size-select-actual"
            density="compact" track-size="2" thumb-size="15">
          </v-slider>
        </v-sheet>
      </v-sheet>
    </v-sheet>





    <!-- Filters -->
    <!-- Quick filters -->
    <v-autocomplete v-if="displayQuickFilters" prepend-icon="mdi-text-search-variant" return-object closable-chips
      v-model="filterQuick" item-title="name" :items="availableTagsFlat" chips clearable multiple density="compact"
      direction="horizontal" variant="solo-inverted">
      <template v-slot:selection="{ attrs, items, select, selected }">
        <v-chip :color="tags[item].color" v-bind="attrs" :model-value="selected" closable @click="select"
          @click:close="remove(item)">
        </v-chip>
      </template>
    </v-autocomplete>

    <!-- Detailed filter — only shows tags present on at least one photo (from allPhotos) -->
    <TagFilter
      v-if="!displayQuickFilters"
      v-model="filterDetail"
      :tag-groups="tagGroups"
      :photos="allPhotos"
    />








    <!-- TODO check behavior when 0 pictures -->
    <!-- v-if="photos.length > 0" -->
    <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
      <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize" class="item"
        v-for="(photo) in photos">
        <div class="item-inner">
          <img @click="$refs.displayPhoto.displayPhoto(photo.filename)"
            :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']" />
          <!-- Favorite shortcut — always visible but subtle; red when active -->
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
    photos: [],    // Filtered photo list — updated on each filter change
    allPhotos: [], // Full photo list loaded once — used to compute available tags
    paths: {},
    sharedDatas: {},
    tags: [],
    tagGroups: [],
    loading: false,
    displayQuickFilters: true, // Quick = search / detailed = categories
    // Filters will be synced using watch
    filter: [], // This is the actual computed filters used abd displayed as query parameter
    filterQuick: [], // This is used by quick filter
    filterDetail: {}, // This is used by filter display with tags
    filterMode: "basic", // Autofilled parameter based on this.displayQuickFilters
  }),
  computed: {
    // Flat list of tag objects present on at least one photo in allPhotos.
    // Used by the quick filter autocomplete to avoid suggesting impossible tags.
    availableTagsFlat() {
      const names = new Set()
      this.allPhotos.forEach(photo => {
        Object.values(photo.tags || {}).forEach(tagList => {
          tagList.forEach(tagName => names.add(tagName))
        })
      })
      return this.tags.filter(tag => names.has(tag.name))
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

    "displayQuickFilters"(newS, oldS) {
      console.log("--watch displayQuickFilters")
      // If true basic if false smart
      if (newS) {this.filterMode = "basic"} else {this.filterMode = "smart"}
      // Put filter in the url in order to be able to share it
      this.$router.push(this.urlQueryTags(this.filter, this.filterMode))
      this.doGetPhotos()
    },
  },
  methods: {
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
        if (this.$route.query.filter_mode == "basic") { this.displayQuickFilters = true } else { this.displayQuickFilters = false }
      }
      await this.doGetPhotos()
      // Store the full unfiltered photo list once — used by TagFilter to compute available tags
      if (this.allPhotos.length === 0) {
        this.allPhotos = [...this.photos]
      }
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

      if (this.displayQuickFilters) {
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

      let queryFilter = ""

      if (this.filter.length > 0) {
        queryFilter = "?" + new URLSearchParams({
          tags: [this.filter],
          filter_mode: this.filterMode,
        })
      }

      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncFetch('/api/photos' + queryFilter)
      if (error.value) {
        triggerAlert("error", "Login failure", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      } else {
        this.paths = data.value.data.paths
        this.photos = data.value.data.photos
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

