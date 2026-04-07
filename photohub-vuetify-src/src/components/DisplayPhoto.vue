<template>
  <PhotoDetail
    ref="photoDetail"
    @deleted="onDeleted"
    @unpublished="onUnpublished"
    @editTags="onEditTags"
  />

  <v-sheet>
    <v-dialog v-model="displayed" fullscreen :scrim="false">
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="closePhoto()">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ currentPhotoName }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-items>
            <!-- Info / detail button -->
            <v-btn
              variant="text"
              prepend-icon="mdi-information-outline"
              @click="openDetail()"
              :disabled="!displayedPhoto"
            >
              Détails
            </v-btn>
          </v-toolbar-items>
        </v-toolbar>

        <v-carousel
          :show-arrows="!sharedDatas.isMobile"
          class="ma-0 pa-0"
          height="100vh"
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
    },

    '$route.query.displayPhoto'(newDisplayPhoto) {
      console.log('--watch route.query.displayPhoto')
      if (!newDisplayPhoto) {
        this.closePhoto()
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
      this.$router.replace(this.urlQueryDisplayPhoto(null))
    },

    displayPhoto(photoName) {
      this.displayedPhoto = photoName
      this.displayed = true
    },

    openDetail() {
      if (this.displayedPhoto) {
        this.$refs.photoDetail.open(this.displayedPhoto)
      }
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
      // Close the fullscreen view, emit up to parent to open tag editor
      this.closePhoto()
      this.$emit('editTags', filename)
    },
  },
})
</script>
