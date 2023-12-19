<template>
  <div class="text-h1">Logout</div>
</template>

<script>

import { useAsyncFetch } from '../reactivefetch.js'
import { useAlertStore } from '../stores/alert'

export default {
  mounted() {
    this.doLogout()
  },
  methods: {
    async doLogout() {
      // Get alert store to be able to trigger some alert messages
      const { triggerAlert } = useAlertStore()

      window.console.log("--logout");
      // const { data, error } = await useAsyncFetch('/api/logout')
      const { data, error } = await useAsyncFetch('/api/logout')
      if (error.value) {
        triggerAlert("error", "Failure unable to decode json", error.value)
      } else if (data.value.ERROR) {
        triggerAlert("error", data.value.message, data.value.details)
      } else {
        this.$router.push({ name: "Login" })
      }
    },
  },
}
</script>