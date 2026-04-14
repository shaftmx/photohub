<template>
  <!-- ──────────────────────────────────────────────────────────
       TagFilter — detailed tag filter panel
       Displays tag groups as chip selectors (checkbox) or
       autocomplete (combobox). Only shows tags that actually
       exist on at least one photo in the provided photo list
       (level 2 filtering — computed once on load, not dynamic).

       Props:
         tagGroups   — full list of groups+tags from /api/tags
         photos      — reference photo list, used to restrict visible tags
         modelValue  — currently selected tags: { groupName: [tagObj, ...] }
         showAll     — if true, show all tags from DB regardless of photos
                       (useful when building views where unassigned tags matter)
       Emits:
         update:modelValue — when selection changes
  ────────────────────────────────────────────────────────────── -->
  <v-sheet class="d-flex align-content-start flex-wrap">
    <v-sheet
      v-for="group in filteredTagGroups"
      :key="group.name"
      class="mr-2 pa-0"
      style="min-width: 18ch"
    >
      <!-- Group header with color indicator -->
      <h4>
        <v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="small" class="mr-1"></v-icon>
        {{ group.name }}
      </h4>

      <!-- Regular tags (checkbox): chips with filter toggle -->
      <v-chip-group
        v-if="group.type == 'checkbox'"
        return-object
        class="d-flex flex-column mb-6"
        multiple
        direction="vertical"
        :model-value="modelValue[group.name] || []"
        @update:model-value="onGroupUpdate(group.name, $event)"
      >
        <v-chip
          v-for="tag in group.tags"
          :key="tag.name"
          :value="tag"
          size="default"
          rounded="lg"
          density="compact"
          variant="outlined"
          filter
          :color="tag.color"
        >{{ tag.name }}</v-chip>
      </v-chip-group>

      <!-- Dynamic tags (combobox): searchable + user can type new values -->
      <v-autocomplete
        v-if="group.type == 'combobox'"
        return-object
        closable-chips
        chips
        clearable
        multiple
        density="compact"
        variant="outlined"
        hide-details
        class="mb-4 combobox-compact"
        :color="group.color"
        item-title="name"
        :items="group.tags"
        :model-value="modelValue[group.name] || []"
        @update:model-value="onGroupUpdate(group.name, $event)"
      >
        <template v-slot:chip="{ item, index, props }">
          <v-chip v-if="index < 2" v-bind="props"
            variant="outlined" size="small" rounded="lg"
            class="tag-chip"
            :style="{ '--chip-color': item.raw.color || group.color }">
            {{ item.title }}
          </v-chip>
          <span v-else-if="index === 2" class="text-caption text-medium-emphasis align-self-center">
            (+{{ (modelValue[group.name] || []).length - 2 }} others)
          </span>
        </template>
      </v-autocomplete>
    </v-sheet>
  </v-sheet>
</template>

<script>
export default {
  name: 'TagFilter',

  props: {
    // Full tag groups list from /api/tags
    tagGroups: { type: Array, default: () => [] },
    // Reference photo list used to restrict which tags are shown (level 2 filtering).
    // Ignored when showAll is true.
    photos: { type: Array, default: () => [] },
    // Currently selected tags per group: { groupName: [tagObj, ...] }
    modelValue: { type: Object, default: () => ({}) },
    // If true, show all tags from DB even if not assigned to any photo.
    // Useful for view building where you want to filter by tags not yet used.
    showAll: { type: Boolean, default: false },
  },

  emits: ['update:modelValue'],

  computed: {
    // Build the set of tag names that appear on at least one photo.
    // Photos have tags as { groupName: [tagName, ...] } (flat strings from get_photos).
    // This is computed once based on the photos prop — not dynamic per selection.
    activeTagNames() {
      const names = new Set()
      this.photos.forEach(photo => {
        Object.values(photo.tags || {}).forEach(tagList => {
          tagList.forEach(tagName => names.add(tagName))
        })
      })
      return names
    },

    // Filter tagGroups to only include tags present in the photo list.
    // If showAll is true or no photos provided, return all groups/tags unchanged.
    filteredTagGroups() {
      if (this.showAll || this.photos.length === 0) return this.tagGroups

      return this.tagGroups
        .map(group => ({
          ...group,
          // Keep only tags that exist on at least one photo
          tags: group.tags.filter(tag => this.activeTagNames.has(tag.name)),
        }))
        // Hide groups that have no available tags
        .filter(group => group.tags.length > 0)
    },
  },

  methods: {
    // Emit a full updated copy of modelValue when a group selection changes
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
.combobox-compact :deep(.v-field__input) {
  opacity: 1 !important;
}
</style>
