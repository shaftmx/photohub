<template>
  <div>
    <v-btn @click="toggleTheme">toggle theme</v-btn>
    <HelloWorld />

    <!-- Placeholder buttons — icon ideas to explore -->
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-group">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-select-group">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-brain">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-head-snowflake-outline">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-head-snowflake">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-image-search">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-filter-variant">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-text-search-variant">Search</v-btn>
    <v-btn color="primary" variant="tonal" stacked :size="sharedDatas.isMobile ? 'x-small' : 'default'" density="compact" prepend-icon="mdi-tag-search">Search</v-btn>

    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn color="primary" v-bind="props">Activator slot</v-btn>
      </template>
      <v-list>
        <v-list-item v-for="(item, index) in items" :key="index" :value="index">
          <v-list-item-title>{{ item.title }} test</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

  </div>
</template>

<script>
import HelloWorld from '@/components/HelloWorld.vue'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  components: { HelloWorld },
  data: () => ({ sharedDatas: {}, items: [] }),
  mounted() {
    this.sharedDatas = getSharedDatas(this)
  },
}
</script>

