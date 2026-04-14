<template>
  <!-- ──────────────────────────────────────────────────────────
       TagGroupsEditor — reusable tag selector UI
       Displays all tag groups with their tags as chips (checkbox)
       or combobox (dynamic). The selected tags are bound via
       v-model (modelValue), which is an object shaped like:
         { groupName: [tagName, tagName, ...], ... }
       Parent passes tagGroups (list of groups with their tags)
       and modelValue (currently selected tags per group).
       When the user changes selection, this component emits
       'update:modelValue' so the parent can react (v-model pattern).
  ────────────────────────────────────────────────────────────── -->
  <v-sheet class="d-flex align-content-start flex-wrap">
    <v-sheet v-for="group in tagGroups" :key="group.name" class="mr-2 pa-0" style="min-width: 18ch">

      <!-- Group header with color indicator -->
      <h4>
        <v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="small" class="mr-1"></v-icon>
        {{ group.name }}
      </h4>

      <!-- Regular tags (checkbox type): displayed as filterable chips -->
      <v-chip-group
        v-if="group.type == 'checkbox'"
        class="d-flex flex-column mb-6"
        multiple
        direction="vertical"
        :model-value="modelValue[group.name] || []"
        @update:model-value="onGroupUpdate(group.name, $event)"
      >
        <v-chip
          v-for="tag in group.tags"
          :key="tag.name"
          :value="tag.name"
          size="default"
          rounded="lg"
          density="compact"
          variant="outlined"
          filter
          :color="tag.color"
        >{{ tag.name }}</v-chip>
      </v-chip-group>

      <!-- Dynamic tags (combobox type): user can also type new values -->
      <v-combobox
        v-if="group.type == 'combobox'"
        closable-chips
        chips
        clearable
        multiple
        density="compact"
        variant="outlined"
        hide-details
        class="mb-4 combobox-compact"
        :color="group.color"
        :items="group.tags.map(t => t.name)"
        :model-value="modelValue[group.name] || []"
        @update:model-value="onGroupUpdate(group.name, $event)"
      >
        <template v-slot:chip="{ item, index, props }">
          <v-chip v-if="index < 2" v-bind="props"
            variant="outlined" size="small" rounded="lg"
            class="tag-chip"
            :style="{ '--chip-color': group.tags.find(t => t.name === item.title)?.color || group.color }">
            {{ item.title }}
          </v-chip>
          <span v-else-if="index === 2" class="text-caption text-medium-emphasis align-self-center">
            (+{{ (modelValue[group.name] || []).length - 2 }} others)
          </span>
        </template>
      </v-combobox>

    </v-sheet>
  </v-sheet>
</template>

<script>
export default {
  name: 'TagGroupsEditor',

  props: {
    // List of tag groups from /api/tags — each group has: name, color, type, tags[]
    tagGroups: { type: Array, required: true },
    // Currently selected tags per group: { groupName: [tagName, ...], ... }
    modelValue: { type: Object, default: () => ({}) },
  },

  emits: ['update:modelValue'],

  methods: {
    // Called when the user changes selection in a group.
    // We emit a full updated copy of modelValue (immutable update pattern).
    onGroupUpdate(groupName, selectedTags) {
      this.$emit('update:modelValue', {
        ...this.modelValue,
        [groupName]: selectedTags,
      })
    },
  },
}
</script>

<style scoped>
.tag-chip {
  color: var(--chip-color) !important;
  border-color: var(--chip-color) !important;
  background-color: color-mix(in srgb, var(--chip-color) 15%, transparent) !important;
}
/* Vuetify applies --v-high-emphasis-opacity to the field input, making chips pale */
.combobox-compact :deep(.v-field__input) {
  opacity: 1 !important;
}
</style>
