<template>
  <div class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin">
    <div
      v-for="photo in photos"
      :key="photo.filename"
      :style="'--ratio: ' + photo.height / photo.width + '; --height: ' + sharedDatas.gridSize"
      class="item"
    >
      <div class="item-inner">
        <img
          :src="paths[sharedDatas.gridPhotoSize] + '/' + photo.hash_path + '/' + photo.filename"
          @click="$emit('item-click', photo)"
        />
        <slot name="overlay" :photo="photo"></slot>
      </div>
    </div>
    <div class="placeholder"></div>
  </div>
</template>

<script>
import '../styles/galleryGrid.css'
import { defineComponent } from 'vue'
import { getSharedDatas } from '../sharedDatas.js'

export default defineComponent({
  props: {
    photos: { type: Array, default: () => [] },
    paths: { type: Object, default: () => ({}) },
  },
  emits: ['item-click'],
  data: () => ({ sharedDatas: {} }),
  mounted() {
    this.sharedDatas = getSharedDatas(this)
  },
})
</script>
