// From https://blog.logrocket.com/complex-vue-3-state-management-pinia/

import { defineStore } from 'pinia'

export const useAlertStore = defineStore('alert', {
  state: () => ({
    showAlert: false,
    message: 'Error',
    detail: '',
    type: 'error', // Could be error or success
    code: 500,
    triggerKey: 0, // incremented on each trigger to force snackbar re-mount and reset its timer
  }),
  actions: {
    triggerAlert(t, msg, d) {
      this.type = t
      this.message = msg
      this.detail = d
      this.triggerKey++
      this.showAlert = true
    }
  }
})

