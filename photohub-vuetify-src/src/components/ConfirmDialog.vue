<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    max-width="400" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-h6 pt-5 px-5">
        {{ action === 'delete' ? 'Delete this photo?' : 'Move back to unpublished?' }}
      </v-card-title>
      <v-card-text class="px-5 text-body-2">
        <span v-if="action === 'delete'">
          This action is <strong>irreversible</strong>. The photo will be permanently deleted from disk and database.
        </span>
        <span v-else>The photo will be removed from the public gallery and moved back to unpublished.</span>
      </v-card-text>
      <v-card-actions class="px-5 pb-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn :color="action === 'delete' ? 'error' : 'warning'" variant="flat"
          @click="$emit('confirm')" :loading="loading">
          {{ action === 'delete' ? 'Delete' : 'Unpublish' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'ConfirmDialog',

  props: {
    modelValue: { type: Boolean, default: false },
    action: { type: String, default: 'delete' }, // 'delete' | 'unpublish'
    loading: { type: Boolean, default: false },
  },

  emits: ['update:modelValue', 'confirm'],
}
</script>
