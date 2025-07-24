<template>
  <DisplayPhoto ref="displayPhoto" :paths="paths" :photos="photos"></DisplayPhoto>

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



          <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn
          color="primary"
          v-bind="props"
        >
          Activator slot
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="(item, index) in items"
          :key="index"
          :value="index"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>



    <v-menu v-model="menu" :close-on-content-click="false" location="bottom">
        <template v-slot:activator="{ props }">
          <v-app-bar-nav-icon v-bind="props"></v-app-bar-nav-icon>
        </template>

        <v-card min-width="300">
          <v-list>
            <v-list-item prepend-avatar="https://cdn.vuetifyjs.com/images/john.jpg" title="John Leider"
              subtitle="Founder of Vuetify">
              <template v-slot:append>
                <v-btn variant="text" :class="darkTheme ? 'text-red' : ''" icon="mdi-heart"
                  @click="darkTheme = !darkTheme"></v-btn>
              </template>
            </v-list-item>
          </v-list>

          <v-divider></v-divider>


          <v-list nav density="compact">
            <!-- Links -->
            <v-list-item v-for="(item, index) in items" @click="menuActionClick(item.action)" :key="index" :value="index"
              color="primary">
              <template v-slot:prepend>
                <v-icon :icon="item.icon"></v-icon>
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>

            <v-divider></v-divider>

            <v-list-item>
              <v-switch v-model="darkTheme" color="primary" label="Darak theme" @change="toggleTheme()"
                hide-details></v-switch>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>


          <v-switch @change="syncFilters()" hide-details v-model="displayQuickFilters" density="compact" color="secondary" false-icon="mdi-text-search-variant" true-icon="mdi-tag-search"
            label="Quick search filter" inset></v-switch>

            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-text-search-variant" >Search</v-btn>
            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-tag-search" >Search</v-btn>

            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-group" >Search</v-btn>
            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-select-group" >Search</v-btn>
            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-brain" >Search</v-btn>
            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-head-snowflake-outline" >Search</v-btn>
            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-head-snowflake" >Search</v-btn>
            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-image-search" >Search</v-btn>
            <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-filter-variant" >Search</v-btn>
            
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
      v-model="filterQuick" item-title="name" :items="tags" chips clearable multiple density="compact"
      direction="horizontal" variant="solo-inverted">
      <template v-slot:selection="{ attrs, items, select, selected }">
        <v-chip :color="tags[item].color" v-bind="attrs" :model-value="selected" closable @click="select"
          @click:close="remove(item)">
        </v-chip>
      </template>
    </v-autocomplete>

    <!-- Filter detailled -->
    <v-sheet v-if="!displayQuickFilters" class="d-flex align-content-start flex-wrap">
      <v-sheet v-for="(group) in tagGroups" class="mr-2 pa-0" style="min-width: 18ch">
        <h4><v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="small" class="mr-1"></v-icon>{{
          group.name }}</h4>

        <!-- Regular tags -->
        <v-chip-group return-object class="d-flex flex-column mb-6" v-if="group.type == 'checkbox'" multiple
          v-model="filterDetail[group.name]">
          <v-chip v-for="(tag) in group.tags" size="default" :value="tag" rounded="lg" density="compact"
            variant="outlined" filter :color="tag.color">{{ tag.name }}</v-chip>
        </v-chip-group>

        <!-- Dynamic tags -->
        <v-autocomplete return-object closable-chips v-if="group.type == 'combobox'" v-model="filterDetail[group.name]"
          item-title="name" :items="group.tags" chips clearable multiple density="compact" direction="horizontal"
          variant="solo-inverted">
          <template v-slot:selection="{ attrs, items, select, selected }">
            <v-chip :color="tags[item].color" v-bind="attrs" :model-value="selected" closable @click="select"
              @click:close="remove(item)">
            </v-chip>
          </template>
        </v-autocomplete>
      </v-sheet>
    </v-sheet>
    <!-- end filters -->








    <!-- TODO check behavior when 0 pictures -->
    <!-- v-if="photos.length > 0" -->
    <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
      <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize" class="item"
        v-for="(photo) in photos">
        <img @click="$refs.displayPhoto.displayPhoto(photo.filename)"
          :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']" />
      </div>
      <div class="placeholder"></div>
    </v-container>
  </v-sheet>
</template>

<script setup>
import DisplayPhoto from '@/components/DisplayPhoto.vue'
</script>


<script>
import '../styles/galleryGrid.css'
import { useAsyncFetch } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    title: "Photos",
    subtitle: "All photos that have been published",
    photos: [],
    paths: {},
    sharedDatas: {},
    tags: [],
    tagGroups: [],
    loading: false,
    displayQuickFilters: true,
    // Filters will be synced using watch
    filter: [], // This is the actual computed filters used abd displayed as query parameter
    filterQuick: [], // This is used by quick filter
    filterDetail: {}, // This is used by filter display with tags
  }),
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
      this.$router.push(this.urlQueryTags(newfilter))
      this.doGetPhotos()
    },
  },
  methods: {
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
            this.filter.push(tag.name)
          }
        })
      }
      this.doGetPhotos()
    },

    urlQueryTags(tags) {
      console.log("--urlQueryFilter")
      // ... mean deep copy
      let q = { ...this.$route.query }
      if (tags != null) {
        q.tags = [tags]
      } else {
        delete q.tags
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

