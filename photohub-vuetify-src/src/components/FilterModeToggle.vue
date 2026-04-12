<template>
  <v-btn-toggle
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    density="compact"
    variant="outlined"
    color="primary"
    mandatory
  >
    <v-btn value="quick" size="small">
      <v-icon size="18">mdi-text-search-variant</v-icon>
      <v-tooltip activator="parent" location="top">Quick filter</v-tooltip>
    </v-btn>
    <v-btn value="detail" size="small">
      <v-icon size="18">mdi-tag-search</v-icon>
      <v-tooltip activator="parent" location="top">Detailed filter</v-tooltip>
    </v-btn>
    <v-btn value="notags" size="small">
      <v-icon size="18">mdi-tag-off-outline</v-icon>
      <v-tooltip activator="parent" location="top">No tags</v-tooltip>
    </v-btn>
  </v-btn-toggle>
</template>

<script>
export default {
  name: 'FilterModeToggle',
  props: {
    modelValue: { type: String, default: 'quick' },
  },
  emits: ['update:modelValue'],
}
</script>
