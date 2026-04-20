<template>
  <v-btn-toggle
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    density="compact"
    variant="outlined"
    color="primary"
    mandatory
  >
    <v-btn value="none" :size="size">
      <v-icon :size="size === 'x-small' ? 14 : 18">mdi-filter-off-outline</v-icon>
      <v-tooltip activator="parent" location="top">No filter</v-tooltip>
    </v-btn>
    <v-btn value="quick" :size="size">
      <v-icon :size="size === 'x-small' ? 14 : 18">mdi-text-search-variant</v-icon>
      <v-tooltip activator="parent" location="top">Quick filter</v-tooltip>
    </v-btn>
    <v-btn value="detail" :size="size">
      <v-icon :size="size === 'x-small' ? 14 : 18">mdi-tag-search</v-icon>
      <v-tooltip activator="parent" location="top">Detailed filter</v-tooltip>
    </v-btn>
    <v-btn value="notags" :size="size">
      <v-icon :size="size === 'x-small' ? 14 : 18">mdi-tag-off-outline</v-icon>
      <v-tooltip activator="parent" location="top">No tags</v-tooltip>
    </v-btn>
  </v-btn-toggle>
</template>

<script>
export default {
  name: 'FilterModeToggle',
  props: {
    modelValue: { type: String, default: 'quick' },
    size: { type: String, default: 'small' },
  },
  emits: ['update:modelValue'],
}
</script>
