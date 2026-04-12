<template>
  <div class="grid ma-0 pa-0" :style="'--gridmargin: ' + sharedDatas.gridMargin">
    <div
      v-for="(photo, index) in localPhotos"
      :key="photo.filename"
      :style="'--ratio: ' + photo.height / photo.width + '; --height: ' + sharedDatas.gridSize"
      class="item"
      :class="{ 'drag-over': draggable && dragOverIndex === index }"
      :draggable="draggable ? 'true' : 'false'"
      @dragstart="draggable && onDragStart(index)"
      @dragover.prevent="draggable && onDragOver(index)"
      @drop.prevent="draggable && onDrop(index)"
      @dragend="draggable && onDragEnd()"
    >
      <div class="item-inner">
        <img
          :src="paths[sharedDatas.gridPhotoSize] + '/' + photo.hash_path + '/' + photo.filename"
          @click="!draggable && $emit('item-click', photo)"
        />
        <slot name="overlay" :photo="photo"></slot>
        <button v-if="draggable" class="drag-handle" title="Drag to reorder">
          <v-icon size="18">mdi-drag</v-icon>
        </button>
        <button v-if="showCover && !draggable" class="cover-btn" :class="{ active: coverFilename === photo.filename }"
          @click.stop="$emit('set-cover', photo)"
          :title="coverFilename === photo.filename ? 'Remove cover' : 'Set as cover'">
          <v-icon size="16">{{ coverFilename === photo.filename ? 'mdi-book-open-page-variant' : 'mdi-book-open-page-variant-outline' }}</v-icon>
        </button>
        <button v-if="showFavorite && !draggable" class="favorite-btn" :class="{ active: photo.favorite }"
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
    draggable: { type: Boolean, default: false },
  },
  emits: ['item-click', 'toggle-favorite', 'set-cover', 'reorder'],
  data: () => ({
    sharedDatas: {},
    localPhotos: [],
    dragIndex: null,
    dragOverIndex: null,
  }),
  watch: {
    photos: {
      handler(val) {
        if (this.dragIndex === null) {
          this.localPhotos = [...val]
        }
      },
      immediate: true,
    },
  },
  mounted() {
    this.sharedDatas = getSharedDatas(this)
  },
  methods: {
    onDragStart(index) {
      this.dragIndex = index
    },
    onDragOver(index) {
      this.dragOverIndex = index
    },
    onDrop(index) {
      if (this.dragIndex === null || this.dragIndex === index) return
      const photos = [...this.localPhotos]
      const [moved] = photos.splice(this.dragIndex, 1)
      photos.splice(index, 0, moved)
      this.localPhotos = photos
      this.dragIndex = null
      this.dragOverIndex = null
      this.$emit('reorder', this.localPhotos)
    },
    onDragEnd() {
      this.dragIndex = null
      this.dragOverIndex = null
    },
  },
})
</script>
