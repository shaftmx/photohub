// check if the user is authentificated

import { useAsyncFetch } from './reactivefetch.js'
import { useAlertStore } from './stores/alert'


export async function requireAuth(rthis) {
    // Get alert store to be able to trigger some alert messages
    const { triggerAlert } = useAlertStore()

    window.console.log("--requireAuth");
    const { data, error } = await useAsyncFetch('/api/is_authenticated')
    if (error.value) {
      triggerAlert("error", "Failure unable to decode json", error.value)
      rthis.$router.push({ name: "Login", query: { next: rthis.$route.fullPath } })
    } else if (data.value.ERROR) {
      triggerAlert("error", data.value.message, data.value.details)
      rthis.$router.push({ name: "Login", query: { next: rthis.$route.fullPath } })
    }
  }