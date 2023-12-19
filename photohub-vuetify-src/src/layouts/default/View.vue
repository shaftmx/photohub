<template>
  <v-main :class="margin" >
    <router-view />
  </v-main>
</template>

<script>
import { getSharedDatas } from '../../sharedDatas.js'

export default {
  data: () => ({
    margin: "ma-10",
    sharedDatas: {},
  }),
  mounted() {
    this.sharedDatas = getSharedDatas(this)

    if (this.sharedDatas.isMobile) {
      this.margin = "ma-3"
    }
  },
}
</script>


