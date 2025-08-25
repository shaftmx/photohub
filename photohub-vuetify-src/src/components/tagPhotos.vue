<template>
  <v-sheet v-if="displayed">
    <!-- bg-surface-variant -->

    <!-- ### Page Header -->
    <v-sheet>
      <v-sheet :class="!sharedDatas.isMobile ? 'ma-2 pa-2 me-auto' : ''">
        <h1 v-if="!sharedDatas.isMobile" class="text-h4 mb-4">{{ title }}</h1>
        <h1 v-if="!sharedDatas.isMobile" class="text-subtitle-1 mb-4">{{ subtitle }}</h1>

        <h1 v-if="sharedDatas.isMobile" class="text-h6 mb-1">{{ title }}</h1>
        <h1 v-if="sharedDatas.isMobile" class="text-body-2 mb-4">{{ subtitle }}</h1>
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
          <v-btn @click="doApplyTags()" class="ml-2" color="primary" variant="flat" :loading="loading"
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
          v-for="(photo) in photos">
          <v-card class="mx-auto">
            <v-img :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']">
            </v-img>
          </v-card>
        </div>
        <div class="placeholder"></div>
      </v-container>

      <!-- TAGS -->
      <h1 class="text-h4 mt-6 mb-0">Tags</h1>

      <v-sheet class="d-flex align-content-start flex-wrap">
        <v-sheet v-for="(group) in tagGroups" class="mr-2 pa-0" style="min-width: 18ch">
          <h4><v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="small" class="mr-1"></v-icon>{{
            group.name }}</h4>

          <!-- Regular tags -->
          <v-chip-group class="d-flex flex-column mb-6" v-if="group.type == 'checkbox'" multiple
            v-model="stagingCommonTags[group.name]" direction="vertical">
            <v-chip v-for="(tag) in group.tags" size="default" :value="tag.name" rounded="lg" density="compact"
              variant="outlined" filter :color="tag.color">{{ tag.name }}</v-chip>
          </v-chip-group>

          <!-- Dynamic tags -->
          <v-combobox closable-chips v-if="group.type == 'combobox'" v-model="stagingCommonTags[group.name]"
            :items="group.tags.map(({ name }) => (name))" chips clearable multiple density="compact"
            direction="horizontal" variant="solo-inverted">
            <template v-slot:selection="{ attrs, items, select, selected }">
              <v-chip :color="tags[item].color" v-bind="attrs" :model-value="selected" closable @click="select"
                @click:close="remove(item)">
              </v-chip>
            </template>
          </v-combobox>
        </v-sheet>
      </v-sheet>

    </v-sheet>


    <!-- #### Single tags mode -->
    <v-sheet v-if="singleDisplay">

      <v-sheet class="d-flex mb-10" v-for="(photo) in taggedPhotos">
        <!-- tags -->
        <v-sheet class="ma-0 pa-0 me-auto">

          <!-- TAGS -->
          <v-sheet class="d-flex align-content-start flex-wrap">
            <v-sheet v-for="(group) in tagGroups" class="mr-2 pa-0" style="min-width: 18ch">
              <h4><v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="small" class="mr-1"></v-icon>{{
                group.name }}</h4>

              <!-- Regular tags -->
              <v-chip-group class="d-flex flex-column" v-if="group.type == 'checkbox'" multiple
                v-model="photo.tags[group.name]" direction="vertical">
                <v-chip v-for="(tag) in group.tags" size="default" :value="tag.name" rounded="lg" density="compact"
                  variant="outlined" filter :color="tag.color">{{ tag.name }}</v-chip>
              </v-chip-group>

              <!-- Dynamic tags -->
              <v-combobox v-if="group.type == 'combobox'" v-model="photo.tags[group.name]"
                :items="group.tags.map(({ name }) => (name))" chips clearable multiple density="compact"
                direction="horizontal" variant="solo-inverted">
                <template v-slot:selection="{ attrs, items, select, selected }">
                  <v-chip :color="tags[item].color" v-bind="attrs" :model-value="selected" closable @click="select"
                    @click:close="remove(item)">
                  </v-chip>
                </template>
              </v-combobox>
            </v-sheet>
          </v-sheet>

        </v-sheet>
        <!-- Picture -->
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


<script >
import { defineComponent } from 'vue';
import { getSharedDatas } from '../sharedDatas.js'
import '../styles/galleryGrid.css'
import { useAlertStore } from '../stores/alert'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'

export default defineComponent({
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
  setup(props) {
  },
  watch: {
  },
  methods: {
    open() {
      this.displayed = true
      // this.taggedPhotos = []
      this.doGetTags()
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
      window.console.log("--genSelectedPhotos");
      // Init
      this.photos = []
      this.currentCommonTags = {}

      // Compute
      var commonGroups = []
      let photoGroups = []
      this.allPhotos.forEach((photo) => {
        if (this.selectedPhotosFilenames.includes(photo.filename)) {
          // Picture selected
          this.photos.push({ ...photo });

          // Compute common tags
          commonGroups = Object.keys(this.currentCommonTags)
          if (commonGroups == 0) {
            this.currentCommonTags = { ...photo.tags }
          } else {
            // Check tags for each common groups
            commonGroups.forEach((tagGroup) => {
              photoGroups = Object.keys(photo.tags)
              if (photoGroups.includes(tagGroup)) {
                // Do filter/intersect between common and photo tags
                this.currentCommonTags[tagGroup] = this.currentCommonTags[tagGroup].filter(value => photo.tags[tagGroup].includes(value));
              } else {
                // If tag group does not exist on current photo, remote it from common
                delete this.currentCommonTags[tagGroup]
              }
            })
          }
        }
      })

      // Mark common tags as staging tags to preselect them
      this.stagingCommonTags = { ...this.currentCommonTags }

      // Create tagget photo list for single view, in order to be able to compare with photos
      // Doing deep copy because this object contain nested objects
      // https://medium.com/@navneetskahlon/shallow-and-deep-copy-in-javascript-a-guide-with-lodash-structuredclone-and-json-methods-071ad2da5cfc#:~:text=A%20deep%20copy%20creates%20a,t%20affect%20the%20original%20object.&text=Lodash%20provides%20a%20cloneDeep%20method,deep%20copying%20complex%20data%20structures.
      this.taggedPhotos = JSON.parse(JSON.stringify(this.photos))

    },
    async doApplyTags() {
      window.console.log("--doApplyTags");
      this.loading = true

      // Get alert store to be able to trigger some alert messages
      const { triggerAlert } = useAlertStore()

      let data = null;
      let error = null;
      if (this.singleDisplay) {
        ({ data, error } = await useAsyncPost('/api/apply_tags', {
          "current_tagged_photos": this.photos,
          "staging_tagged_photos": this.taggedPhotos
        }))
      } else {
        ({ data, error } = await useAsyncPost('/api/apply_tags', {
          "current_common_tags": this.currentCommonTags,
          "staging_common_tags": this.stagingCommonTags,
          "common_photos_filename": this.selectedPhotosFilenames
        }))
      }

      if (error.value) {
        triggerAlert("error", "Tag failure", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      }
      this.loading = false
      this.close()
    },
  },
})
</script>
