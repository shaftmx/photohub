<template>
  <v-container class="fill-height" style="max-width: 960px;">
    <v-responsive class="align-center text-center fill-height">

      <v-form ref="form" v-model="form" @submit.prevent="onSubmit">
        <h1 class="text-sm-h3 mb-4">Upload files</h1>

        <!-- <v-file-input @change="handleFilesUpload($event)" v-model="files" :rules="[required]" :readonly="loading" -->

        <v-file-input v-model="files" :rules="[required]" :readonly="loading" accept="image/jpeg" multiple
          label="File input" prepend-icon="mdi-camera" chips show-size counter variant="solo"></v-file-input>

        <p>You can <strong class="text-primary">drag and drop</strong> files to upload. <strong
            class="text-primary">JPEG</strong> file type only.</p>
        <v-btn color="primary" class="mb-4 mt-4" :disabled="!form" :loading="loading" type="submit">
          Upload
        </v-btn>

      </v-form>

      <!-- v-if="loading" -->
      <v-container v-if="uploaded_files.length > 0" class="mt-5" style="max-width: 400px;">
        <v-table density="compact" class="mb-4">
          <thead>
            <tr>
              <th class="text-grey-darken-1 text-left">
                <v-progress-circular color="primary" class="mr-5" :width="4" size="20"
                  :model-value="progress"></v-progress-circular> Uploaded files
              </th>
              <th class="text-grey-darken-1 text-right" style="border: 0;">
                
                <v-btn @click="goTo('Unpublished')" variant="text" icon color="primary"> <v-tooltip activator="parent"
                    location="top">Go to uploaded file page</v-tooltip>
                  <v-icon>mdi-tag-arrow-right-outline</v-icon>
                </v-btn>

              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in uploaded_files" :key="item.name">
              <td style="border: 0px" class="text-left text-grey">{{ item.name }}</td>
              <td style="border: 0px" class="text-right text-grey"></td>
            </tr>
          </tbody>
        </v-table>


        <!-- <v-progress-circular color="primary" :width="5" size="40" model-value="20"></v-progress-circular> -->
        <!-- <v-progress-linear color="primary" model-value="20" :height="5"></v-progress-linear> -->
      </v-container>


    </v-responsive>
  </v-container>
</template>

<script>


import { useAsyncUploadFile } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'

export default {
  data: () => ({
    form: false,
    files: [],
    uploaded_files: [],
    loading: false,
    progress: 0,
    currentFile: "",
  }),
  mounted() {
    requireAuth(this)
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

      // Reset state
      this.uploaded_files = []
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
        formData.append('picture.jpg', file);
        const { data, error } = await useAsyncUploadFile('/api/upload', formData)
        if (error.value) {
          this.loading = false
          triggerAlert("error", "Upload failure", error.value)
          return
        } else if (data.value.ERROR) {
          this.loading = false
          triggerAlert("error", data.value.message, data.value.details)
          return
        } else {
          this.uploaded_files.push(file)
          this.progress = Math.round((100 * this.uploaded_files.length) / this.files.length);
        }
      }
      this.$refs.form.reset()
      triggerAlert("success", "All files uploaded", "")
      this.loading = false
      this.files = []

      // Note: if we want to improve and automatically redirect after few seconds to unpublished page, simply uncomment this line
      // setTimeout(() => (this.$router.push({ name: "Unpublished" })), 5000)

      // TODO passer l'icone en vert OK a la fin de l'upload ou un petit message. Pas super visible aprés un gros upload que tout est fini
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
