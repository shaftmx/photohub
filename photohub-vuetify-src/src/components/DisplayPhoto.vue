<template>
  <v-sheet>
    <v-dialog v-model="displayed" fullscreen :scrim="false">
      <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">

        <v-toolbar dark color="primary" density="compact">
          <v-btn icon dark @click="closePhoto()">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ currentPhotoName }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-items>
            <!-- Mobile: back to photo when detail panel is open -->
            <v-btn v-if="showDetail && sharedDatas.isMobile" variant="text" prepend-icon="mdi-arrow-left"
              @click="showDetail = false">
              Photo
            </v-btn>
            <!-- Detail toggle -->
            <v-btn variant="text" :prepend-icon="showDetail ? 'mdi-information' : 'mdi-information-outline'"
              @click="toggleDetail()" :disabled="!displayedPhoto">
              Details
            </v-btn>
          </v-toolbar-items>
        </v-toolbar>

        <div class="d-flex flex-grow-1 overflow-hidden" style="min-height: 0;">
          <!-- Carousel (hidden on mobile when detail is open) -->
          <div
            v-show="!showDetail || !sharedDatas.isMobile"
            class="flex-grow-1 overflow-hidden"
            style="min-height: 0;"
          >
            <v-carousel
              :show-arrows="!sharedDatas.isMobile"
              height="100%"
              hide-delimiters
              show-arrows="hover"
              v-model="displayedPhoto"
            >
              <v-carousel-item
                v-for="(photo) in photos"
                :key="photo.filename"
                :value="photo.filename"
                :src="paths[sharedDatas.displayPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']"
              ></v-carousel-item>
            </v-carousel>
          </div>

          <!-- Detail panel (full width on mobile, fixed width on desktop) -->
          <div
            v-if="showDetail"
            class="overflow-y-auto"
            :style="sharedDatas.isMobile
              ? 'width: 100%; min-height: 0;'
              : 'width: 480px; min-height: 0; border-left: 1px solid rgba(0,0,0,0.12);'"
          >
            <PhotoDetail
              ref="photoDetail"
              :embedded="true"
              @deleted="onDeleted"
              @unpublished="onUnpublished"
              @editTags="onEditTags"
            />
          </div>
        </div>

      </v-card>
    </v-dialog>
  </v-sheet>
</template>


<script>
import { defineComponent } from 'vue'
import { getSharedDatas } from '../sharedDatas.js'
import PhotoDetail from '../views/PhotoDetail.vue'

export default defineComponent({
  components: { PhotoDetail },

  props: {
    photos: Object,
    paths: Object,
  },

  emits: ['photoDeleted', 'photoUnpublished', 'editTags'],

  data: () => ({
    displayed: false,
    displayedPhoto: null,
    showDetail: false,
    sharedDatas: {},
  }),

  computed: {
    currentPhotoName() {
      return this.displayedPhoto || 'Photo'
    },
  },

  mounted() {
    this.sharedDatas = getSharedDatas(this)
    if (this.$route.query.displayPhoto) {
      this.displayedPhoto = this.$route.query.displayPhoto
      this.displayed = true
    }
  },

  watch: {
    'displayedPhoto'(newPhotoName, oldPhotoName) {
      console.log('--watch displayedPhoto')
      if (oldPhotoName == null && newPhotoName != null) {
        this.$router.push(this.urlQueryDisplayPhoto(newPhotoName))
      } else if (oldPhotoName != null && newPhotoName != null) {
        this.$router.replace(this.urlQueryDisplayPhoto(newPhotoName))
      }
      // Refresh detail panel when switching photos
      if (this.showDetail && newPhotoName) {
        this.$nextTick(() => this.$refs.photoDetail?.open(newPhotoName))
      }
    },

    '$route.query.displayPhoto'(newDisplayPhoto) {
      console.log('--watch route.query.displayPhoto')
      if (!newDisplayPhoto) {
        this.closePhoto()
      }
    },

    'showDetail'(val) {
      if (val && this.displayedPhoto) {
        this.$nextTick(() => this.$refs.photoDetail?.open(this.displayedPhoto))
      }
    },
  },

  methods: {
    urlQueryDisplayPhoto(photoName) {
      let q = { ...this.$route.query }
      if (photoName != null) {
        q.displayPhoto = photoName
      } else {
        delete q.displayPhoto
      }
      return { query: q }
    },

    closePhoto() {
      this.displayed = false
      this.displayedPhoto = null
      this.showDetail = false
      this.$router.replace(this.urlQueryDisplayPhoto(null))
    },

    displayPhoto(photoName) {
      this.displayedPhoto = photoName
      this.displayed = true
    },

    toggleDetail() {
      this.showDetail = !this.showDetail
    },

    onDeleted(filename) {
      this.$emit('photoDeleted', filename)
      this.closePhoto()
    },

    onUnpublished(filename) {
      this.$emit('photoUnpublished', filename)
      this.closePhoto()
    },

    onEditTags(filename) {
      this.closePhoto()
      this.$emit('editTags', filename)
    },
  },
})
</script>
