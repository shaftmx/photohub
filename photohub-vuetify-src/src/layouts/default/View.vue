<template>
  <v-main :class="margin" >
    <router-view/>
  </v-main>
</template>

<script>
import { getSharedDatas } from '../../sharedDatas.js'

export default {
  data: () => ({
    margin: "ma-6 mt-0",
    sharedDatas: {},
  }),
  mounted() {
    this.sharedDatas = getSharedDatas(this)

    if (this.sharedDatas.isMobile) {
      this.margin = "ma-2 mt-0"
    }
  },
}
</script>