<template>
  <v-sheet v-if="displayed">

    <!-- ### Page Header -->
    <v-sheet>
      <v-sheet :class="!sharedDatas.isMobile ? 'ma-2 pa-2 me-auto' : ''">
        <PageTitle :title="title" :is-mobile="sharedDatas.isMobile" :subtitle="subtitle" />
      </v-sheet>
      <v-sheet class="d-flex mb-2">
        <v-sheet class="ma-0 pa-0 me-auto">
          <!-- Single display button -->
          <v-switch hide-details v-model="singleDisplay" density="compact" color="secondary" label="Single display"></v-switch>
        </v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-end justify-end w-50">
          <v-btn @click="close()" color="primary" variant="tonal" :size="sharedDatas.isMobile ? 'small' : 'default'"
            density="compact" prepend-icon="mdi-keyboard-backspace" :loading="loading">Back</v-btn>
          <!-- :disabled="taggedPhotos.length > 1 || JSON.stringify(currentCommonTags) != JSON.stringify(stagingCommonTags) ? true : false" -->
          <v-btn @click="doApplyTags()" class="ml-2" color="primary" variant="tonal" :loading="loading"
            :size="sharedDatas.isMobile ? 'small' : 'default'" density="compact" prepend-icon="mdi-check-circle"
            :disabled="JSON.stringify(taggedPhotos) == JSON.stringify(photos) && JSON.stringify(currentCommonTags) == JSON.stringify(stagingCommonTags) ? true : false">Apply</v-btn>
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


    <!-- #### Multi tags mode -->
    <!-- Photo grid -->
    <v-sheet v-if="!singleDisplay">
      <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
        <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize" class="item"
          v-for="(photo) in photos" :key="photo.filename">
          <v-card class="mx-auto">
            <v-img :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']">
            </v-img>
          </v-card>
        </div>
        <div class="placeholder"></div>
      </v-container>

      <!-- TAGS — common tags applied to all selected photos -->
      <h1 class="text-h4 mt-6 mb-0">Tags</h1>
      <!-- TagGroupsWidget handles the tag UI, v-model syncs with stagingCommonTags -->
      <TagGroupsWidget v-model="stagingCommonTags" :tag-groups="tagGroups" />
    </v-sheet>


    <!-- #### Single tags mode — one row per photo with its own tag editor -->
    <v-sheet v-if="singleDisplay">
      <v-sheet class="d-flex mb-10" v-for="photo in taggedPhotos" :key="photo.filename">

        <!-- Tags column — TagGroupsWidget bound to this specific photo's tags -->
        <v-sheet class="ma-0 pa-0 me-auto">
          <TagGroupsWidget v-model="photo.tags" :tag-groups="tagGroups" />
        </v-sheet>

        <!-- Picture column -->
        <v-sheet class="ma-0 pa-0">
          <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize"
            class="item">
            <v-card class="mx-auto">
              <v-img :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']">
              </v-img>
            </v-card>
          </div>
        </v-sheet>
      </v-sheet>
    </v-sheet>

    <v-btn @click="scrollTop()" color="primary" variant="tonal" :size="sharedDatas.isMobile ? 'small' : 'default'"
      density="compact" prepend-icon="mdi-arrow-up" :loading="loading">Go top</v-btn>

    <!-- current photos: {{ photos }}
    <br />
    tagget photos: {{ taggedPhotos }}
    <br />
    stagingCommonTags: {{ stagingCommonTags }}
    <br />
    currentCommonTags: {{ currentCommonTags }} -->

  </v-sheet>
</template>


<script>
import { defineComponent } from 'vue';
import { getSharedDatas } from '../sharedDatas.js'
import '../styles/galleryGrid.css'
import { useAlertStore } from '../stores/alert'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import TagGroupsWidget from './TagGroupsWidget.vue'
import PageTitle from './PageTitle.vue'

export default defineComponent({
  components: { TagGroupsWidget, PageTitle },

  props: {
    allPhotos: Object,
    selectedPhotosFilenames: Array,
    paths: Object,
  },

  data: () => ({
    currentCommonTags: {},
    stagingCommonTags: {},
    photos: [],
    displayed: false,
    taggedPhotos: [],
    title: "Tag pictures",
    subtitle: "Tag and organize your pictures to create dynamic views",
    sharedDatas: {},
    tags: [],
    tagGroups: [],
    singleDisplay: false,
    loading: false,
  }),

  mounted() {
    this.sharedDatas = getSharedDatas(this)
    // Override default grid size in order to display all as small pictures
    this.sharedDatas.gridSize = this.sharedDatas.gridMin
  },

  methods: {
    async open() {
      this.displayed = true
      await this.doGetTags()
      this.genSelectedPhotos()
    },

    close() {
      this.$emit('closed', true)
      this.displayed = false
      this.stagingCommonTags = {}
      this.taggedPhotos = []
    },

    scrollTop() {
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
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

    genSelectedPhotos() {
      this.photos = []
      this.currentCommonTags = {}

      // Compute intersection of tags across selected photos (strings from API)
      let commonGroups = []
      this.allPhotos.forEach((photo) => {
        if (!this.selectedPhotosFilenames.includes(photo.filename)) return
        this.photos.push({ ...photo })
        commonGroups = Object.keys(this.currentCommonTags)
        if (commonGroups.length === 0) {
          this.currentCommonTags = { ...photo.tags }
        } else {
          commonGroups.forEach((tagGroup) => {
            if (Object.keys(photo.tags).includes(tagGroup)) {
              this.currentCommonTags[tagGroup] = this.currentCommonTags[tagGroup].filter(
                v => photo.tags[tagGroup].includes(v)
              )
            } else {
              delete this.currentCommonTags[tagGroup]
            }
          })
        }
      })

      // Convert string tags → tagObj format for TagGroupsWidget
      this.currentCommonTags = this.toTagObjs(this.currentCommonTags)
      this.stagingCommonTags = JSON.parse(JSON.stringify(this.currentCommonTags))
      this.taggedPhotos = JSON.parse(JSON.stringify(this.photos)).map(p => ({
        ...p,
        tags: this.toTagObjs(p.tags),
      }))
    },

    // Convert { group: [tagName, ...] } → { group: [tagObj, ...] }
    toTagObjs(tags) {
      const result = {}
      for (const [groupName, names] of Object.entries(tags)) {
        const group = this.tagGroups.find(g => g.name === groupName)
        result[groupName] = names.map(name =>
          group?.tags.find(t => t.name === name) || { name }
        )
      }
      return result
    },

    // Convert { group: [tagObj, ...] } → { group: [tagName, ...] } for API
    flattenTags(tags) {
      const result = {}
      for (const [group, tagList] of Object.entries(tags)) {
        if (tagList?.length) result[group] = tagList.map(t => t.name ?? t)
      }
      return result
    },

    async doApplyTags() {
      this.loading = true
      const { triggerAlert } = useAlertStore()

      let data = null
      let error = null
      if (this.singleDisplay) {
        const current = this.photos.map(p => ({ ...p, tags: this.flattenTags(p.tags) }))
        const staging = this.taggedPhotos.map(p => ({ ...p, tags: this.flattenTags(p.tags) }))
        ;({ data, error } = await useAsyncPost('/api/apply_tags', {
          current_tagged_photos: current,
          staging_tagged_photos: staging,
        }))
      } else {
        ;({ data, error } = await useAsyncPost('/api/apply_tags', {
          current_common_tags: this.flattenTags(this.currentCommonTags),
          staging_common_tags: this.flattenTags(this.stagingCommonTags),
          common_photos_filename: this.selectedPhotosFilenames,
        }))
      }

      if (error.value) {
        triggerAlert('error', 'Tag failure', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      }
      this.loading = false
      this.close()
    },
  },
})
</script>
