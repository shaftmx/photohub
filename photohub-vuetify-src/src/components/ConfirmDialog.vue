<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
    max-width="400" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-h6 pt-5 px-5">
        {{ action === 'delete' ? 'Supprimer la photo ?' : 'Repasser en non publié ?' }}
      </v-card-title>
      <v-card-text class="px-5 text-body-2">
        <span v-if="action === 'delete'">
          Cette action est <strong>irréversible</strong>. La photo sera supprimée du disque et de la base de données.
        </span>
        <span v-else>La photo sera retirée de la galerie publique et repassera en "non publiée".</span>
      </v-card-text>
      <v-card-actions class="px-5 pb-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Annuler</v-btn>
        <v-btn :color="action === 'delete' ? 'error' : 'warning'" variant="flat"
          @click="$emit('confirm')" :loading="loading">
          {{ action === 'delete' ? 'Supprimer' : 'Dépublier' }}
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
