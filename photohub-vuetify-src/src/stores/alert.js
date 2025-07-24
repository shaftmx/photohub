// From https://blog.logrocket.com/complex-vue-3-state-management-pinia/

import { defineStore } from 'pinia'

export const useAlertStore = defineStore('alert', {
  state: () => ({
    showAlert: false,
    message: 'Error',
    detail: '',
    type: 'error', // Could be error or success
    code: 500,
  }),
  // getters: {
  //   getAlert: (state) => {
  //     return (authorId) => state.posts.filter((post) => post.userId === authorId)
  //   }
  // }, 
  actions: {
    triggerAlert(t, msg, d) {
      this.type = t
      this.message = msg
      this.detail = d      
      this.showAlert = true
    }
  }
})

