<template>
  <div>
    <!-- Preset chips -->
    <div class="d-flex flex-wrap ga-1 mb-2">
      <v-chip
        v-for="p in presets" :key="p.key"
        size="x-small" class="cursor-pointer"
        :variant="preset === p.key ? 'tonal' : 'outlined'"
        :color="preset === p.key ? 'primary' : 'default'"
        @click="$emit('update:preset', p.key)"
      >{{ p.label }}</v-chip>
      <v-chip
        size="x-small" class="cursor-pointer"
        :variant="preset === 'custom' ? 'tonal' : 'outlined'"
        :color="preset === 'custom' ? 'primary' : 'default'"
        @click="$emit('update:preset', 'custom')"
      >Custom</v-chip>
      <v-icon
        v-if="preset"
        size="16" color="primary" class="cursor-pointer ml-1" style="opacity: 0.8"
        title="Remove expiry"
        @click="$emit('update:preset', null); $emit('update:date', null)"
      >mdi-cancel</v-icon>
    </div>

    <!-- Custom: date picker -->
    <v-text-field
      v-if="preset === 'custom'"
      :model-value="date"
      @update:model-value="$emit('update:date', $event)"
      type="date"
      density="compact" variant="outlined" hide-details
    ></v-text-field>
  </div>
</template>

<script>
export default {
  name: 'ExpiryPicker',
  props: {
    preset: { type: String, default: null },
    date:   { type: String, default: null },
  },
  emits: ['update:preset', 'update:date'],
  data: () => ({
    presets: [
      { key: '1h', label: '1h' },
      { key: '3h', label: '3h' },
      { key: '1d', label: '1d' },
      { key: '1w', label: '1w' },
      { key: '1m', label: '1m' },
    ],
  }),
}
</script>
