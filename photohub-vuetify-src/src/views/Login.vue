<template>
  <!-- From https://next.vuetifyjs.com/en/components/text-fields/#forms -->
  <v-sheet class="bg-neutral2 pa-12" rounded>
    <v-card class="mx-auto px-6 py-8" max-width="344">
      <v-form v-model="form" @submit.prevent="onSubmit">
        <v-text-field v-model="username" :readonly="loading" :rules="[required]" class="mb-2" clearable
          label="Username"></v-text-field>

        <v-text-field v-model="password" :readonly="loading" :rules="[required]" clearable type="password"
          label="Password" placeholder="Enter your password"></v-text-field>
        <br>
        <v-btn :disabled="!form" :loading="loading" block color="primary" size="large" type="submit" variant="elevated">
          Login
        </v-btn>
        <div class="mt-2">
          <p class="text-body-2">Don't have an account? <a href="#">Sign Up</a></p>
        </div>
      </v-form>
    </v-card>
  </v-sheet>
</template>


<script>
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { useAlertStore } from '../stores/alert'


export default {
  data: () => ({
    form: false,
    username: null,
    password: null,
    loading: false,
  }),
  mounted() {
  },
  methods: {
    async onSubmit() {
      if (!this.form) return
      this.loading = true

      // Get alert store to be able to trigger some alert messages
      const { triggerAlert } = useAlertStore()

      window.console.log("--login get csrf token");
      const { tkdata, tkerror } = await useAsyncFetch('/api/get_csrf')

      window.console.log("--login");
      const { data, error } = await useAsyncPost('/api/login', { "username": this.username, "password": this.password })

      if (error.value) {
        triggerAlert("error", "Login failure", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      } else {
        if (this.$route.query.next) {
          console.log(" FULLLPTH" + this.$route.query.next)
          // Note: we know this keep path but remove query. If needed later on, I will update this methode to parse and keep query params
          this.$router.push({ path: this.$route.query.next })
        } else {
          this.$router.push({ name: "Home" })
        }
      }
      this.loading = false
    },
    required(v) {
      return !!v || 'Field is required'
    },
  },
}
</script>