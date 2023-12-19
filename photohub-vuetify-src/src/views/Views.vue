<template>
  <div class="text-h1">Views</div>
</template>

<script>


import { useAsyncFetch } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { useAlertStore } from '../stores/alert'

export default {
  mounted() {
    requireAuth(this)
  },
  methods: {
  },
}
</script>
