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
        <button v-if="showCover" class="cover-btn" :class="{ active: coverFilename === photo.filename }"
          @click.stop="$emit('set-cover', photo)"
          :title="coverFilename === photo.filename ? 'Remove cover' : 'Set as cover'">
          <v-icon size="16">{{ coverFilename === photo.filename ? 'mdi-book-open-page-variant' : 'mdi-book-open-page-variant-outline' }}</v-icon>
        </button>
        <button v-if="showFavorite" class="favorite-btn" :class="{ active: photo.favorite }"
          @click.stop="$emit('toggle-favorite', photo)"
          :title="photo.favorite ? 'Remove from favorites' : 'Add to favorites'">
          <v-icon size="18">{{ photo.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
        </button>
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
    showFavorite: { type: Boolean, default: false },
    showCover: { type: Boolean, default: false },
    coverFilename: { type: String, default: null },
  },
  emits: ['item-click', 'toggle-favorite', 'set-cover'],
  data: () => ({ sharedDatas: {} }),
  mounted() {
    this.sharedDatas = getSharedDatas(this)
  },
})
</script>
