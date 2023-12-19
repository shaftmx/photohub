<template>
  <DisplayPhoto ref="displayPhoto" :paths="paths" :photos="photos"></DisplayPhoto>

  <!-- HEADER REGULAR DISPLAY -->
  <v-sheet v-if="!sharedDatas.isMobile" class="d-flex mb-4">
    <v-sheet class="ma-2 pa-2 me-auto">
      <h1 class="text-h4 mb-4">Unpublished</h1>
      <h1 class="text-subtitle-1 mb-4">All recently uploaded photos that have not been published</h1>
    </v-sheet>
    <!-- Photo grid size selector -->
    <v-sheet class="d-flex ma-2 pa-2 align-end justify-end w-50"><v-slider v-model="sharedDatas.gridSize"
        style="max-width: 300px; width: 100%" :max="sharedDatas.gridMax" :min="sharedDatas.gridMin" hide-details color="primary"
        append-icon="mdi-image-size-select-actual" density="compact" track-size="2" thumb-size="15">
      </v-slider>
    </v-sheet>
  </v-sheet>
  <!-- HEADER MOBILE DISPLAY -->
  <div v-else="!sharedDatas.isMobile">
    <v-sheet>
      <h1 class="text-h6 mb-1">Unpublished</h1>
      <h1 class="text-body-2 mb-4">All recently uploaded photos that have not been published</h1>
    </v-sheet>
    <!-- Photo grid size selector -->
    <v-sheet class="d-flex mb-0">
      <v-sheet class="ma-0 pa-0 me-auto"></v-sheet>
      <v-sheet class="d-flex ma-0 pa-0 align-end justify-end w-50"><v-slider v-model="sharedDatas.gridSize"
          style="max-width: 300px; width: 100%" :max="sharedDatas.gridMax" :min="sharedDatas.gridMin" hide-details color="primary"
          append-icon="mdi-image-size-select-actual" density="compact" track-size="2" thumb-size="15">
        </v-slider>
      </v-sheet>
    </v-sheet>
  </div>

  <!-- v-if="photos.length > 0" -->


  <v-container class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin" fluid>
    <div :style="'--ratio: ' + photo['height'] / photo['width'] + ';  --height: ' + sharedDatas.gridSize" class="item"
      v-for="(photo) in photos">
      <img @click="$refs.displayPhoto.displayPhoto(photo.filename)"
        :src="paths[sharedDatas.gridPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']" />
    </div>
    <div class="placeholder"></div>
  </v-container>
</template>

<script setup>
import DisplayPhoto from '@/components/DisplayPhoto.vue'
</script>


<script>
import { useAsyncFetch } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    photos: [],
    paths: {},
    sharedDatas: {},
  }),
  mounted() {   
    requireAuth(this)
    this.sharedDatas = getSharedDatas(this)

    this.doGetPhotos()

  },
  methods: {
    async doGetPhotos() {
      window.console.log("--doGetPhotos");
      const { data, error } = await useAsyncFetch('/api/unpublished')
      if (error.value) {
        triggerAlert("error", "Login failure", error.value)
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

<style>
.grid {
  display: flex;
  flex-wrap: wrap;
  --gridmargin: 2px;
  --height: 240;
  /* Minimal row height */
  --ratio: 1;
  /* Default aspect ratio for photos that are not loaded yet */
}

.item {
  flex: calc(var(--height) / var(--ratio));
  min-width: calc(var(--height) / var(--ratio) * 1px);
  margin: var(--gridmargin);
  font-size: 0;
}

.item img {
  width: 100%;
}

.placeholder {
  flex-grow: 99999;
}
</style>

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