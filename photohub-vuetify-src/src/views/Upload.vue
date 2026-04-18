<template>
  <v-container class="fill-height" style="max-width: 960px;">
    <v-responsive class="align-center text-center fill-height">

      <v-form ref="form" v-model="form" @submit.prevent="onSubmit">
        <h1 class="text-sm-h3 mb-4">Upload files</h1>

        <!-- <v-file-input @change="handleFilesUpload($event)" v-model="files" :rules="[required]" :readonly="loading" -->

        <v-file-input v-model="files" :rules="[required]" :readonly="loading" :accept="acceptedTypes" multiple
          label="File input" prepend-icon="mdi-upload" chips show-size counter variant="solo"></v-file-input>

        <p>You can <strong class="text-primary">drag and drop</strong> files to upload.
          <strong class="text-primary">JPEG</strong> photos<template v-if="allowVideoUpload"> and <strong class="text-primary">MP4/MOV</strong> videos</template> accepted.</p>
        <v-btn color="primary" class="mb-4 mt-4" :disabled="!form" :loading="loading" type="submit">
          Upload
        </v-btn>

      </v-form>

      <!-- v-if="loading" -->
      <v-container v-if="uploaded_files.length > 0" class="mt-5" style="max-width: 500px;">

        <!-- Header: progress + count + nav button -->
        <div class="d-flex align-center mb-3 ga-2">
          <v-progress-circular color="primary" :width="4" size="20" :model-value="progress"></v-progress-circular>
          <span class="text-body-2 text-medium-emphasis">{{ uploaded_files.length }} / {{ total_files }} uploaded</span>
          <v-spacer></v-spacer>
          <v-btn @click="goTo('Unpublished')" variant="text" icon color="primary" size="small">
            <v-tooltip activator="parent" location="top">Go to unpublished</v-tooltip>
            <v-icon>mdi-tag-arrow-right-outline</v-icon>
          </v-btn>
        </div>

        <!-- File list — most recent first, no preview -->
        <v-list density="compact" class="pa-0">
          <v-list-item
            v-for="item in [...uploaded_files].reverse()"
            :key="item.name"
            class="px-2 py-1 mb-1 rounded"
            style="background: rgba(0,0,0,0.04);"
          >
            <template v-slot:prepend>
              <v-icon size="20" class="mr-2" :color="item.type && item.type.startsWith('video/') ? 'primary' : 'medium-emphasis'">
                {{ item.type && item.type.startsWith('video/') ? 'mdi-video' : 'mdi-image' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-caption text-truncate">{{ item.name }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption text-medium-emphasis">{{ (item.size / 1024).toFixed(0) }} KB</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <!-- <v-progress-circular color="primary" :width="5" size="40" model-value="20"></v-progress-circular> -->
        <!-- <v-progress-linear color="primary" model-value="20" :height="5"></v-progress-linear> -->
      </v-container>


    </v-responsive>
  </v-container>
</template>

<script>


import { useAsyncUploadFile, useAsyncFetch } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'

export default {
  data: () => ({
    form: false,
    files: [],
    uploaded_files: [],
    total_files: 0,
    loading: false,
    progress: 0,
    currentFile: "",
    allowVideoUpload: false,
  }),
  computed: {
    acceptedTypes() {
      return this.allowVideoUpload
        ? 'image/jpeg,video/mp4,video/quicktime,video/webm'
        : 'image/jpeg'
    },
  },
  async mounted() {
    requireAuth(this)
    const { data } = await useAsyncFetch('/api/admin/config')
    if (data.value && !data.value.ERROR) {
      const val = data.value.data.ALLOW_VIDEO_UPLOAD
      this.allowVideoUpload = val === 'True' || val === true || val === '1'
    }
  },
  beforeUnmount() {
    // Revoke object URLs to free memory
    this.uploaded_files.forEach(f => { if (f._objectUrl) URL.revokeObjectURL(f._objectUrl) })
  },
  methods: {
    // handleFilesUpload(event) {
    //   console.log(event.target.files)
    //   console.log(this.files)
    //   // this.files = event.target.files;
    //   // let formData = new FormData();
    //   // for (var i = 0; i < this.files.length; i++) {
    //   //   let file = this.files[i];
    //   //   console.log(file)
    //   //   formData.append('files[' + i + ']', file);
    //   // }
    // },
    goTo(page) {
      console.log("--goTo " + page)
      this.$router.push({ name: page })
    },
    async onSubmit() {
      if (!this.form) return
      this.loading = true
      // Get alert store to be able to trigger some alert messages
      const { triggerAlert } = useAlertStore()

      // Reset state — revoke previous object URLs first
      this.uploaded_files.forEach(f => { if (f._objectUrl) URL.revokeObjectURL(f._objectUrl) })
      this.uploaded_files = []
      this.total_files = this.files.length
      this.progress = 0

      // Note: I decided to upload files one by one, to limite size and post traitement handeling. It's potentially not the most efficient way
      // Maybe migrate later on with axios and progress bar callback see https://serversideup.net/file-upload-progress-indicator-with-axios-and-vuejs/
      let formData = new FormData();
      for (var i = 0; i < this.files.length; i++) {
        let file = this.files[i];

        // Multiple file upload
        // formData.append('files[' + i + ']', file); // Use this for multiple files uploads
        // Then you can do this request in only one post

        // Single file upload
        formData = new FormData();
        formData.append(file.name, file);
        const { data, error } = await useAsyncUploadFile('/api/upload', formData)
        if (error.value) {
          this.loading = false
          triggerAlert("error", `Upload failure: ${file.name}`, error.value)
          return
        } else if (data.value.ERROR) {
          this.loading = false
          triggerAlert("error", data.value.message, data.value.details)
          return
        } else {
          // Attach a local preview URL for the thumbnail
          file._objectUrl = URL.createObjectURL(file)
          this.uploaded_files.push(file)
          this.progress = Math.round((100 * this.uploaded_files.length) / this.total_files);
        }
      }
      this.$refs.form.reset()
      triggerAlert("success", `${this.uploaded_files.length} file${this.uploaded_files.length !== 1 ? 's' : ''} uploaded`, "")
      this.loading = false
      this.files = []

      // Note: if we want to improve and automatically redirect after few seconds to unpublished page, simply uncomment this line
      // setTimeout(() => (this.$router.push({ name: "Unpublished" })), 5000)
    },

    required(v) {
      if (v && v.length === 0) { return false }
      return true
    },
  },
}
</script>

<!-- Note: Future improvement could be to handle each image API calls status in order to display photo with failure icon/success or skipped.
This will also require on BE side to handle a special status code for skipped images -->
