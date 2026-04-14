// Auth guards — call these in mounted() of pages that require authentication.

import { useAsyncFetch } from './reactivefetch.js'
import { useAlertStore } from './stores/alert'


/**
 * requireAuth — redirect to Login if the user is not authenticated.
 */
export async function requireAuth(rthis) {
    const { triggerAlert } = useAlertStore()
    const { data, error } = await useAsyncFetch('/api/is_authenticated')
    if (error.value) {
      triggerAlert("error", "Failure unable to decode json", error.value)
      rthis.$router.push({ name: "Login", query: { next: rthis.$route.fullPath } })
    } else if (data.value.ERROR) {
      triggerAlert("error", data.value.message, data.value.details)
      rthis.$router.push({ name: "Login", query: { next: rthis.$route.fullPath } })
    }
}

/**
 * requireAdminOrContributor — redirect to Login if not authenticated,
 * or to Home if the user doesn't have admin or contributor role.
 * Returns { role, id, username } on success, null if redirected.
 */
export async function requireAdminOrContributor(rthis) {
    const { triggerAlert } = useAlertStore()
    const { data, error } = await useAsyncFetch('/api/is_authenticated')
    if (error.value || !data.value || data.value.ERROR) {
      rthis.$router.push({ name: "Login", query: { next: rthis.$route.fullPath } })
      return null
    }
    const { role, id, username } = data.value.data || {}
    if (role !== 'admin' && role !== 'contributor') {
      triggerAlert("error", "Access denied", "Admin or contributor role required")
      rthis.$router.push({ name: "Home" })
      return null
    }
    return { role, id, username }
}