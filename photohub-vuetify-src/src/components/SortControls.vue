<template>
  <div class="d-flex align-center ga-2">
    <v-select
      :model-value="sortBy"
      @update:model-value="$emit('update:sortBy', $event)"
      :items="allOptions"
      item-title="label"
      item-value="value"
      variant="outlined"
      density="compact"
      hide-details
      style="min-width: 140px; max-width: 180px"
    ></v-select>
    <v-btn
      :icon="sortDir === 'desc' ? 'mdi-sort-descending' : 'mdi-sort-ascending'"
      variant="text"
      density="compact"
      size="small"
      :title="sortDir === 'desc' ? 'Descending' : 'Ascending'"
      @click="$emit('update:sortDir', sortDir === 'desc' ? 'asc' : 'desc')"
    ></v-btn>
  </div>
</template>

<script>
const BASE_OPTIONS = [
  { label: 'Photo date',   value: 'date' },
  { label: 'Upload date',  value: 'upload_date' },
  { label: 'Rating',       value: 'rating' },
  { label: 'Filename',     value: 'filename' },
]

export default {
  name: 'SortControls',

  props: {
    sortBy:       { type: String, default: 'date' },
    sortDir:      { type: String, default: 'desc' },
    // Extra options injected by specific pages (e.g. custom order in ViewDetail)
    extraOptions: { type: Array,  default: () => [] },
  },

  emits: ['update:sortBy', 'update:sortDir'],

  computed: {
    allOptions() {
      return [...BASE_OPTIONS, ...this.extraOptions]
    },
  },
}
</script>
