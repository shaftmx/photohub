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
          :src="paths[adaptivePhotoSize] + '/' + photo.hash_path + '/' + thumbFilename(photo)"
          @click="!draggable && $emit('item-click', photo, index, $event)"
        />
        <div v-if="photo.type === 'video'" class="video-overlay" @click="!draggable && $emit('item-click', photo, index, $event)">
          <v-progress-circular v-if="photo.transcode_status !== 'done'" indeterminate color="white" size="40"></v-progress-circular>
          <v-icon v-else size="48" color="white" style="opacity:0.85">mdi-play-circle</v-icon>
          <span v-if="photo.duration" class="video-duration">{{ formatDuration(photo.duration) }}</span>
        </div>
        <slot name="overlay" :photo="photo" :index="index"></slot>
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
import { thumbFilename, formatDuration } from '../photoUtils.js'

export default defineComponent({
  props: {
    photos: { type: Array, default: () => [] },
    paths: { type: Object, default: () => ({}) },
    showFavorite: { type: Boolean, default: false },
    showCover: { type: Boolean, default: false },
    coverFilename: { type: String, default: null },
    draggable: { type: Boolean, default: false },
    sharedDatas: { type: Object, required: true },
  },
  emits: ['item-click', 'toggle-favorite', 'set-cover', 'reorder'],
  data: () => ({
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
  computed: {
    // Pick the smallest sample whose max_size (px) is at least 2× the rendered
    // grid item height, so images stay sharp at any slider position.
    // Breakpoints come from paths._sizes (populated by get_photo_root_paths()
    // from SAMPLE_PHOTOS_SETTINGS in settings.py) — no hardcoded values here.
    adaptivePhotoSize() {
      const sizes = this.paths._sizes
      if (!sizes) return this.sharedDatas.gridPhotoSize || 's'
      const target = (this.sharedDatas.gridSize || 0) * 2
      const sorted = Object.entries(sizes).sort((a, b) => a[1] - b[1])
      for (const [name, maxSize] of sorted) {
        if (maxSize >= target) return name
      }
      return sorted[sorted.length - 1][0]
    },
  },
  methods: {
    thumbFilename,
    formatDuration,
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
