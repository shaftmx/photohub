<template>
  <!-- <v-overlay class="align-center justify-center" v-model="displayed" :persistent="true" scroll-strategy="block">
    <v-app>
      <v-main>
        <v-container class="bg-surface-variant ma-0 pa-0 fill-height">
          <v-responsive class="align-center text-center fill-height">
            <v-carousel class="ma-0 pa-0" height="100vh" hide-delimiters show-arrows="hover" v-model="displayedPhoto">
              <v-carousel-item v-for="(photo, i) in photos" :key="photo.filename" :value="photo.filename"
                :src="paths[sharedDatas.displayPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']"
                cover></v-carousel-item>
            </v-carousel>
          </v-responsive>
        </v-container>
      </v-main>
      <v-footer class="d-flex flex-column">
        <div class="bg-teal d-flex w-100 align-center px-4">
          <strong>Get connected with us on social networks!</strong>
          <v-spacer></v-spacer>
          <v-btn v-for="icon in icons" :key="icon" class="mx-4" :icon="icon" variant="plain" size="small"></v-btn>
        </div>
        <div class="px-4 py-2 bg-black text-center w-100">
          {{ new Date().getFullYear() }} — <strong>Vuetify</strong>
        </div>
      </v-footer>
    </v-app>
  </v-overlay> -->
  <!-- 100dvh -->



  <!-- <v-carousel-item v-for="(photo, i) in photos" :key="photo.filename" :value="photo.filename"
                :src="paths[sharedDatas.displayPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']"
                cover></v-carousel-item> -->
  <!-- <v-row justify="center">
    <v-overlay class="align-center justify-center" v-model="displayed" :persistent="true" scroll-strategy="block">
      <v-container class="bg-surface-variant h-screen ma-0 pa-0" style="min-width: 100dvw;">
        <v-carousel class="ma-0 pa-0" height="100vh" hide-delimiters show-arrows="hover" v-model="displayedPhoto">
              <v-carousel-item v-for="(photo, i) in photos" :key="photo.filename" :value="photo.filename"
                :src="paths[sharedDatas.displayPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']"
                ></v-carousel-item>
            </v-carousel>
      </v-container>

      <v-app class="rounded rounded-md w-100 bg-surface-variant" width="100%">
        <v-app-bar title="Application bar"></v-app-bar>

        <v-navigation-drawer>
          <v-list>
            <v-list-item title="Navigation drawer"></v-list-item>
          </v-list>
        </v-navigation-drawer>

        <v-main class="d-flex align-center justify-center w-100" style="min-height: 300px;">
          Main Content
        </v-main>
      </v-app>
    </v-overlay>
  </v-row> -->

  <!-- Previously v row instead of vshit but it seems to remove marging, kind of cool but not the same as other pages -->
  <!-- <v-row justify="center" > -->

  <v-sheet>
    <v-dialog v-model="displayed" fullscreen :scrim="false">
      <v-card>
        <!-- <v-card theme="dark"> uncomment to force dark theme-->
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="closePhoto()">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>Settings</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-items>
            <v-btn variant="text" @click="closePhoto()">
              Save
            </v-btn>
          </v-toolbar-items>
        </v-toolbar>

        <v-carousel :show-arrows="!sharedDatas.isMobile" class="ma-0 pa-0" height="100vh" hide-delimiters show-arrows="hover"
          v-model="displayedPhoto">
          <!-- max-height     max-width  min-height min-width width -->
          <v-carousel-item v-for="(photo, i) in photos" :key="photo.filename" :value="photo.filename"
            :src="paths[sharedDatas.displayPhotoSize] + '/' + photo['hash_path'] + '/' + photo['filename']"></v-carousel-item>
        </v-carousel>

      </v-card>
    </v-dialog>
  </v-sheet>
</template>


<script >
import { defineComponent } from 'vue';
import { getSharedDatas } from '../sharedDatas.js'

export default defineComponent({
  props: {
    photos: Object,
    paths: Object,
  },
  data: () => ({
    displayed: false,
    displayedPhoto: null,
  }),
  mounted() {
    this.sharedDatas = getSharedDatas(this)
    if (this.$route.query.displayPhoto) {
      this.displayedPhoto = this.$route.query.displayPhoto
      this.displayed = true
    }
  },
  setup(props) {
    // console.log(props.photos)
  },
  watch: {
    "displayedPhoto"(newPhotoName, oldPhotoName) {
      // When photo change from the caroussel selection, replace it in the url
      console.log("--watch displayedPhoto")
      // console.log(oldPhotoName)
      // console.log(newPhotoName)
      // First picture do a push to write new URL entry in the history
      if (oldPhotoName == null && newPhotoName != null) {
        this.$router.push(this.urlQueryDisplayPhoto(newPhotoName))
      } else if (oldPhotoName != null && newPhotoName != null) {
        // Second This mean we are scrolling, so just replace the current url in the history
        this.$router.replace(this.urlQueryDisplayPhoto(newPhotoName))
      } // If old not null but new is null it mean we probably exit or clear the component
    },

    // This is basically used in oder to close the display when you hit browser back button
    "$route.query.displayPhoto"(newDisplayPhoto, oldDisplayPhoto) {
      console.log("--watch route.query.displayPhoto")
      // console.log(oldDisplayPhoto)
      // console.log(newDisplayPhoto)
      // This mean we pressed back browser button and removed ?displayPhoto from the url. So stop the display
      if (!newDisplayPhoto) {
        this.closePhoto()
      }
    },
    // "$route.hash"(newHash, oldHash) {
    //   console.log("--watch route.hash")

    //   if (newHash === "#my-dialog") {
    //     this.displayed = true;
    //   } else if (oldHash === "#my-dialog") {
    //     this.displayed = false;
    //   }
    // }
  },
  methods: {
    urlQueryDisplayPhoto(photoName) {
      console.log("--updateDisplayPhotoQuery")
      // ... mean deep copy
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
      // history.pushState(
      //   {},
      //   null,
      //   this.$route.path + '/' + encodeURIComponent(photoName)
      // )
      // this.$router.push("?my-dialog")
      this.displayedPhoto = photoName
      this.displayed = true
    },
  },

})
</script>
