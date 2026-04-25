<template>
  <!-- Count + select/deselect button -->
  <span v-if="showCount" class="text-body-2 text-medium-emphasis">{{ selectedCount }} selected</span>
  <v-btn
    @click="selectedCount > 0 ? $emit('deselect-all') : $emit('select-all')"
    :size="isMobile ? 'small' : 'default'"
    color="secondary" variant="tonal" density="compact"
    :prepend-icon="selectedCount > 0 ? 'mdi-select-off' : 'mdi-select-all'"
  >{{ selectedCount > 0 ? 'Deselect all' : 'Select all' }}</v-btn>

  <!-- Actions dropdown -->
  <v-menu>
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" :size="isMobile ? 'small' : 'default'" color="primary" variant="tonal"
        density="compact" append-icon="mdi-chevron-down" :disabled="selectedCount < 1">Actions</v-btn>
    </template>
    <v-list density="compact">
      <!-- View-specific actions (Tag, Publish, Unpublish, Delete…) injected by parent -->
      <slot />
      <!-- Built-in: favorites — API call handled here, parent receives @done -->
      <v-list-item @click="bulkSetFavorite(true)">
        <template #prepend><v-icon color="red" class="mr-4">mdi-heart</v-icon></template>
        <v-list-item-title>Add to favorites</v-list-item-title>
      </v-list-item>
      <v-list-item @click="bulkSetFavorite(false)">
        <template #prepend><v-icon class="mr-4">mdi-heart-off-outline</v-icon></template>
        <v-list-item-title>Remove from favorites</v-list-item-title>
      </v-list-item>
      <!-- Built-in: rating -->
      <v-list-item @click="ratingDialog = true">
        <template #prepend><v-icon class="mr-4">mdi-star</v-icon></template>
        <v-list-item-title>Set rating</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>

  <!-- Rating picker dialog -->
  <v-dialog v-model="ratingDialog" width="auto">
    <v-card>
      <v-card-title class="text-body-1 font-weight-medium pa-4 pb-2">
        Set rating — {{ selectedCount }} photo{{ selectedCount !== 1 ? 's' : '' }}
      </v-card-title>
      <v-card-text class="d-flex align-center ga-1 pt-0 pb-4">
        <v-btn icon variant="text" density="compact" @click="bulkSetRating(0); ratingDialog = false">
          <v-icon>mdi-star-off-outline</v-icon>
          <v-tooltip activator="parent" location="top">Clear rating</v-tooltip>
        </v-btn>
        <v-btn v-for="star in [1, 2, 3, 4, 5]" :key="star"
          icon variant="text" density="compact" color="amber"
          @click="bulkSetRating(star); ratingDialog = false">
          <v-icon>mdi-star</v-icon>
          <v-tooltip activator="parent" location="top">{{ star }} star{{ star > 1 ? 's' : '' }}</v-tooltip>
        </v-btn>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { useAlertStore } from '../stores/alert'
import { useAsyncPost } from '../reactivefetch.js'

export default {
  name: 'BulkActionsMenu',

  props: {
    selectedCount: { type: Number, required: true },
    // Filenames of currently selected photos — used for API calls
    filenames:     { type: Array, default: () => [] },
    isMobile:      { type: Boolean, default: false },
    showCount:     { type: Boolean, default: true },
  },

  // @done is emitted after every built-in bulk action (favorite / rating).
  // The parent should deselect all and refresh its photo list.
  emits: ['select-all', 'deselect-all', 'done'],

  data: () => ({
    ratingDialog: false,
  }),

  methods: {
    async bulkSetFavorite(newValue) {
      const { triggerAlert } = useAlertStore()
      for (const filename of this.filenames) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/update`, { favorite: newValue })
        if (error.value) triggerAlert('error', 'Save error', error.value)
        else if (data.value?.ERROR) triggerAlert('error', data.value.message, data.value.details)
      }
      this.$emit('done')
    },

    async bulkSetRating(rating) {
      const { triggerAlert } = useAlertStore()
      for (const filename of this.filenames) {
        const { data, error } = await useAsyncPost(`/api/photos/${filename}/update`, { rating })
        if (error.value) triggerAlert('error', 'Save error', error.value)
        else if (data.value?.ERROR) triggerAlert('error', data.value.message, data.value.details)
      }
      this.$emit('done')
    },
  },
}
</script>
