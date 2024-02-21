<template>
  <!-- <TagPhotos @closed="(i) => {doGetPhotos(); displayed = true}" ref="tagPhotos" :paths="paths" :photos="photos.map((x) => {if (selectedPhotos.includes(x.filename)){ x } })" :selected="selectedPhotos"></TagPhotos> -->
  <!-- <TagPhotos @closed="(i) => { doGetPhotos(); displayed = true }" ref="tagPhotos" :paths="paths" :photos="test()"     :selected="selectedPhotos"></TagPhotos> -->

  <TagPhotos @closed="(i) => { doGetPhotos(); displayed = true }" ref="tagPhotos" :paths="paths" :allPhotos="photos"
    :selectedPhotosFilenames="selectedPhotosFilenames"></TagPhotos>
  <!-- <TagPhotos @closed="(i) => { doGetPhotos(); displayed = true }" ref="tagPhotos" :paths="paths"
    :photos="getSelectedPhotos()"></TagPhotos> -->
  <!-- <TagPhotos @closed="(i) => { doGetPhotos(); displayed = true }" ref="tagPhotos" :paths="paths"
    :photos="getSelectedPhotos()" :selected="selectedPhotos"></TagPhotos> -->

  <v-sheet v-if="displayed">

    <!-- Header -->
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
          <v-btn @click="selectAll()" class="mr-2" :size="sharedDatas.isMobile ? 'small' : 'default'" color="secondary"
            variant="tonal" density="compact" prepend-icon="mdi-border-all">All</v-btn>
          <v-btn @click="deselectAll()" :size="sharedDatas.isMobile ? 'small' : 'default'" color="secondary"
            variant="tonal" density="compact" prepend-icon="mdi-border-all-variant">None</v-btn>
        </v-sheet>
        <v-sheet class="d-flex ma-0 pa-0 align-end justify-end w-50">
          <!-- TAG BUTTON -->
          <v-btn @click="displayed = false; $refs.tagPhotos.open()" color="primary" variant="tonal"
            :size="sharedDatas.isMobile ? 'small' : 'default'" density="compact" prepend-icon="mdi-tag-arrow-right"
            :disabled="selectedPhotosFilenames.length < 1 ? true : false">Tag</v-btn>
          <!-- PUBLISH BUTTON -->
          <v-btn @click="confirmPublishDialog = true; loading = true" class="ml-2" color="primary" variant="flat"
            :size="sharedDatas.isMobile ? 'small' : 'default'" density="compact" prepend-icon="mdi-cloud-check" :loading="loading"
            :disabled="selectedPhotosFilenames.length < 1 ? true : false">Publish</v-btn>
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



    <!-- CONFIRM PUBLISHING -->
    <v-dialog v-model="confirmPublishDialog" persistent width="auto">
      <v-card>
        <v-card-title class="text-h5">
          Confirm publishing selected photos?
        </v-card-title>
        <v-card-text>All selected photos will be published and visible by all users.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" density="compact" variant="text" @click="confirmPublishDialog = false; loading = false">
            Disagree
          </v-btn>
          <v-btn color="primary" density="compact" variant="tonal" @click="confirmPublishDialog = false; publishSelected()">
            Agree
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>



    <!-- Card hover with transition -->
    <!-- <div>
      <v-hover v-slot="{ isHovering, props }">
        <v-card class="mx-auto" color="grey-lighten-4" max-width="600" v-bind="props">
          <v-img :aspect-ratio="16 / 9" cover src="https://cdn.vuetifyjs.com/images/cards/kitchen.png">
            <v-expand-transition style="height: 100%; cursor: grab;">
              <div style="cursor: grab;" v-if="isHovering"
                class="d-flex transition-fast-in-fast-out bg-blue-darken-2 v-card--reveal text-h2">
                <v-icon size="large" color="primary" icon="mdi-image-plus-outline"></v-icon>
              </div>
            </v-expand-transition>
          </v-img>
        </v-card>
      </v-hover>
    </div> -->

    <!-- Card hover with overlay -->
    <!-- <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize" class="item"
        v-for="(photo) in photos">
        <v-hover v-slot="{ isHovering, props }">
          <v-card class="mx-auto" v-bind="props">
            <img @click="displayed = false; $refs.tagPhotos.open()"
              :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']" />

            <v-overlay style="cursor: pointer;" :model-value="isHovering" contained scrim="#036358"
              class="align-center justify-center">

              <v-card min-height="200px" min-width="200px">
                <v-icon size="large" color="blue-darken-2" icon="mdi-message-text"></v-icon> </v-card>
            </v-overlay>
          </v-card>
        </v-hover>
      </div> -->






    <!-- v-if="photos.length > 0" -->
    <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
      <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize" class="item"
        v-for="(photo) in photos">
        <v-hover v-slot="{ isHovering, props }">
          <v-card class="mx-auto" v-bind="props">
            <!-- <v-img @click="displayed = false; $refs.tagPhotos.open()" -->
            <v-img @click="selectDeselect(photo)"
              :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']">

              <!-- Tagged layer: mark picture already tagged  -->

              <!-- <div style="height: 100%; ">
                <div style="height: 2%; opacity: 1; position: relative;" v-if="true"
                  class="d-flex v-card--reveal  bg-error">
                </div>
                <div style="height: 2%; opacity: 1; " v-if="true" class="d-flex v-card--reveal  bg-error">
                </div>
              </div> -->
              <div style="height: 2%; opacity: 1;" v-if="Object.keys(photo['tags']).length == 0"
                class="d-flex v-card--reveal  bg-error">
              </div>
              <!-- <div style="height: 1%; opacity: 1; " v-if="true" class="d-flex v-card--reveal text-h4 bg-success">
              </div> -->

              <!-- Selected layer: DUPLICATE of the div below, this is to keep icon displayed when selected. Placed on top to be actually below layer during rendering. In order to not override the cursor grab -->
              <div style="height: 100%; opacity: 1; " v-if="selectedPhotosFilenames.includes(photo.filename)"
                class="d-flex v-card--reveal text-h4">
                <v-icon style="opacity: 1;" color="secondary" icon="mdi-image-plus-outline"
                  :size="sharedDatas.isMobile ? 'x-small' : 'x-large'"></v-icon>
              </div>
              <!-- Note: -ms-user-select: none; -webkit-user-select: none; user-select: none; disable user selection, to prevent a bug when you spal clic and select the image -->
              <div
                style="height: 100%; cursor: grab; background: rgba(0, 0, 0, 0.4); opacity: 1; -ms-user-select: none; -webkit-user-select: none; user-select: none;"
                v-if="isHovering" class="d-flex v-card--reveal text-h4">
                <!-- Set opacity 1 to override v-card--reveal and allow us to manually set different opacity on background and icon -->
                <v-icon style="opacity: 1;" color="secondary" icon="mdi-image-plus-outline"
                  :size="sharedDatas.isMobile ? 'x-small' : 'x-large'"
                  v-if="selectedPhotosFilenames.includes(photo.filename)"></v-icon>
              </div>
            </v-img>
          </v-card>
        </v-hover>
      </div>
      <div class="placeholder"></div>
    </v-container>
  </v-sheet>
</template>


<style>
.v-card--reveal {
  align-items: center;
  bottom: 0;
  justify-content: center;
  opacity: 0.5;
  position: absolute;
  width: 100%;
}
</style>


<script setup>
import TagPhotos from '@/components/tagPhotos.vue'
</script>


<script>
import '../styles/galleryGrid.css'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'

export default {
  data: () => ({
    confirmPublishDialog: false,
    displayed: true,
    title: "Unpublished",
    subtitle: "All recently uploaded photos that have not been published",
    photos: [],
    selectedPhotosFilenames: [],
    paths: {},
    sharedDatas: {},
    loading: false,
  }),
  mounted() {
    requireAuth(this)
    this.sharedDatas = getSharedDatas(this)
    this.doGetPhotos()
  },
  methods: {
    async publishSelected() {
      window.console.log("--publishSelected");

      this.loading = true

      // Get alert store to be able to trigger some alert messages
      const { triggerAlert } = useAlertStore()

      const { data, error } = await useAsyncPost('/api/publish', {
        "photos": this.selectedPhotosFilenames,
      })

      if (error.value) {
        triggerAlert("error", "Tag failure", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      }
      this.doGetPhotos()
      this.loading = false
    },
    selectDeselect(photo) {
      // window.console.log(photo)
      // window.console.log(JSON.stringify(photo))

      if (this.selectedPhotosFilenames.includes(photo.filename)) {
        const index = this.selectedPhotosFilenames.indexOf(photo.filename);
        this.selectedPhotosFilenames.splice(index, 1); // remove it
      } else {
        this.selectedPhotosFilenames.push(photo.filename) // add it
      }
    },
    deselectAll() {
      this.selectedPhotosFilenames = []
    },
    selectAll() {
      // this.selectedPhotos = [...this.photos] // ... deep copy
      this.selectedPhotosFilenames = this.photos.map((x) => x.filename);
    },
    async doGetPhotos() {
      window.console.log("--doGetPhotos");
      // Get alert store to be able to trigger some alert messages
      const { triggerAlert } = useAlertStore()

      const { data, error } = await useAsyncFetch('/api/unpublished')
      if (error.value) {
        triggerAlert("error", "Request failure", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      } else {
        this.paths = data.value.data.paths
        this.photos = data.value.data.photos
      }
    }
  },
}
</script>

<!-- https://vuetifyjs.com/en/components/carousels/#usage
https://vuetifyjs.com/en/components/images/#usage -->
<!-- https://vuetifyjs.com/en/components/bottom-navigation/ -->

<!-- using this gallery https://codepen.io/johandegrieck/pen/xpVdBG 

Has been discarded because sometime it produce lat pic to take all screen place, more than max width

.gallery section {
  display: flex;
  flex-wrap: wrap;
}

.gallery div {
  flex-grow: 1;
  margin: 2px;
  background-color: white;
  height: 300px;
}

.gallery img {
  height: 300px;
  object-fit: cover;
  max-width: 500px;
  /* max-width: 100%; */
  min-width: 100%;
  vertical-align: bottom;
}

.placeholder {
  flex-grow: 99999;
} -->



<!-- https://codepen.io/DarkoKukovec/pen/mgowGG -->
<!-- .grid {
  display: flex;
  flex-wrap: wrap;
  --height: 240; /* Minimal row height */
  --ratio: 1; /* Default aspect ratio for photos that are not loaded yet */
}

.item {
  flex: calc(var(--height) / var(--ratio));
  min-width: calc(var(--height) / var(--ratio) * 1px);
  margin: 2px;
  font-size: 0;
}

.item img {
  width: 100%;
}

.placeholder {
  flex-grow: 99999;
} -->


