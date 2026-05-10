<template>
  <v-sheet :class="isMobile ? 'd-flex flex-column' : 'd-flex align-content-start flex-wrap'">
    <v-sheet
      v-for="group in filteredTagGroups"
      :key="group.name"
      class="pa-0"
      :class="isMobile ? 'mb-2' : 'mr-2'"
      :style="isMobile ? 'width: 100%' : 'min-width: 18ch'"
    >
      <!-- Group header (with optional "no tag" toggle on the right) -->
      <h4 class="d-flex align-center ga-1" style="line-height:1">
        <v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="small"></v-icon>
        {{ group.name }}
        <v-tooltip v-if="group.description" location="right" max-width="260" content-class="tag-desc-tooltip">
          <template #activator="{ props }">
            <v-icon v-bind="props" size="13" class="text-medium-emphasis" style="opacity:0.55; cursor:help; vertical-align:middle">mdi-information-outline</v-icon>
          </template>
          {{ group.description }}
        </v-tooltip>
        <!-- Per-group "no tag in this group" toggle (only in filter mode w/ excludes enabled).
             Mutually exclusive with selecting any tag from this group: toggling it on clears
             includes/excludes for the group, and selecting a tag clears the toggle. -->
        <v-btn
          v-if="enableExclude"
          :icon="isGroupNoTag(group.name) ? 'mdi-tag-off' : 'mdi-tag-off-outline'"
          :color="isGroupNoTag(group.name) ? 'warning' : 'default'"
          :variant="isGroupNoTag(group.name) ? 'tonal' : 'text'"
          density="compact" size="x-small" class="ml-1"
          :title="isGroupNoTag(group.name) ? `Remove '${group.name}: none' filter` : `Show only photos with no '${group.name}' tag`"
          :disabled="disabled"
          @click="toggleNoTag(group.name)"
        ></v-btn>
      </h4>

      <!-- Tri-state checkbox chips (filter mode w/ excludes): manual click cycle off -> include -> exclude -> off.
           Color is applied only when the tag is selected (include/exclude); off keeps the default neutral
           styling so unselected tags don't appear active — matches the v-chip-group "filter" behavior. -->
      <div
        v-if="group.type === 'checkbox' && enableExclude && !isGroupNoTag(group.name)"
        class="d-flex flex-column mb-6"
      >
        <v-chip
          v-for="tag in group.tags"
          :key="tag.name"
          :size="isMobile ? 'small' : 'default'"
          rounded="lg"
          density="compact"
          variant="outlined"
          :disabled="disabled"
          :color="tagState(group.name, tag) === 'off' ? undefined : tag.color"
          style="align-self: flex-start; cursor: pointer;"
          :style="tagState(group.name, tag) === 'exclude' ? { textDecoration: 'line-through' } : null"
          @click="cycleTag(group.name, tag)"
        >{{ tag.name }}
          <v-tooltip v-if="tag.description" activator="parent" location="top" max-width="220" content-class="tag-desc-tooltip">{{ tag.description }}</v-tooltip>
        </v-chip>
      </div>

      <!-- Standard checkbox chips (edit mode, or filter mode without excludes) -->
      <v-chip-group
        v-if="group.type === 'checkbox' && !enableExclude"
        return-object
        multiple
        direction="vertical"
        class="d-flex flex-column mb-6"
        :model-value="modelValue[group.name] || []"
        @update:model-value="onGroupUpdate(group.name, $event)"
      >
        <v-chip
          v-for="tag in group.tags"
          :key="tag.name"
          :value="tag"
          :size="isMobile ? 'small' : 'default'"
          rounded="lg"
          density="compact"
          variant="outlined"
          filter
          :disabled="disabled"
          :color="tag.color"
          style="align-self: flex-start"
        >{{ tag.name }}
          <v-tooltip v-if="tag.description" activator="parent" location="top" max-width="220" content-class="tag-desc-tooltip">{{ tag.description }}</v-tooltip>
        </v-chip>
      </v-chip-group>

      <!-- Combobox: allowNew=true → free entry (edit mode), false → selection only (filter mode) -->
      <v-combobox
        v-if="group.type === 'combobox' && allowNew"
        closable-chips chips clearable multiple
        density="compact" variant="outlined" hide-details
        return-object
        item-title="name"
        autocomplete="new-password"
        name="tag-combobox-nofill"
        class="mb-4 combobox-compact"
        :style="isMobile ? 'max-width: 220px' : ''"
        :disabled="disabled"
        :color="group.color"
        :menu-props="{ contentClass: 'combobox-menu' }"
        :items="group.tags"
        :model-value="modelValue[group.name] || []"
        @update:model-value="onComboUpdate(group.name, group.tags, $event)"
      >
        <template #chip="{ item, index, props }">
          <v-chip
            v-if="index < 1"
            variant="outlined"
            size="small"
            rounded="lg"
            closable
            :color="item?.color || group.color"
            @click:close="(e) => props['onClick:close']?.(e)"
          >{{ item?.name ?? item }}</v-chip>
          <span v-else-if="index === 1" class="text-caption text-medium-emphasis align-self-center">
            +{{ (modelValue[group.name] || []).length - 1 }}
          </span>
        </template>
      </v-combobox>
      <v-autocomplete
        v-if="group.type === 'combobox' && !allowNew && !isGroupNoTag(group.name)"
        closable-chips chips clearable multiple
        density="compact" variant="outlined" hide-details
        return-object
        item-title="name"
        autocomplete="new-password"
        name="tag-autocomplete-nofill"
        class="mb-4 combobox-compact"
        :style="isMobile ? 'max-width: 220px' : ''"
        :disabled="disabled"
        :color="group.color"
        :menu-props="{ contentClass: 'combobox-menu' }"
        :items="group.tags"
        :model-value="modelValue[group.name] || []"
        @update:model-value="onGroupUpdate(group.name, $event)"
      >
        <template #chip="{ item, index, props }">
          <v-chip
            v-if="index < 1"
            variant="outlined"
            size="small"
            rounded="lg"
            closable
            :color="item?.color || group.color"
            @click:close="(e) => props['onClick:close']?.(e)"
          >{{ item?.name ?? item }}</v-chip>
          <span v-else-if="index === 1" class="text-caption text-medium-emphasis align-self-center">
            +{{ (modelValue[group.name] || []).length - 1 }}
          </span>
        </template>
      </v-autocomplete>
    </v-sheet>
  </v-sheet>
</template>

<script>
export default {
  name: 'TagGroupsWidget',

  props: {
    tagGroups:  { type: Array,   default: () => [] },
    modelValue: { type: Object,  default: () => ({}) },
    // Exclude state per group: { groupName: [tag, ...] } — tags the photo must NOT have.
    // Only meaningful when enableExclude is true.
    modelValueExclude: { type: Object, default: () => ({}) },
    // Array of group names for which "no tag in this group" is toggled on.
    noTagGroups: { type: Array, default: () => [] },
    // When provided, only tags present on these photos are shown (filter mode).
    // When empty/omitted, all tags from tagGroups are shown (edit mode).
    photos:     { type: Array,   default: () => [] },
    showAll:    { type: Boolean, default: false },
    isMobile:   { type: Boolean, default: false },
    disabled:   { type: Boolean, default: false },
    // false in filter mode: combobox groups become autocomplete (no free entry)
    allowNew:   { type: Boolean, default: true },
    // Filter mode: enables the tri-state click cycle on checkbox tags
    // (off → include → exclude → off) and the per-group "no tag" toggle.
    enableExclude: { type: Boolean, default: false },
  },

  emits: ['update:modelValue', 'update:modelValueExclude', 'update:noTagGroups'],

  computed: {
    activeTagNames() {
      const names = new Set()
      this.photos.forEach(photo => {
        Object.values(photo.tags || {}).forEach(tagList => {
          tagList.forEach(name => names.add(name))
        })
      })
      return names
    },

    filteredTagGroups() {
      if (this.showAll || this.photos.length === 0) return this.tagGroups
      return this.tagGroups
        .map(group => ({
          ...group,
          tags: group.tags.filter(tag => this.activeTagNames.has(tag.name)),
        }))
        .filter(group => group.tags.length > 0)
    },
  },

  methods: {
    // Existing — emit include selection for a group
    onGroupUpdate(groupName, selectedTags) {
      this.$emit('update:modelValue', { ...this.modelValue, [groupName]: selectedTags })
    },

    // v-combobox can emit either tag objects or strings; normalize to objects.
    onComboUpdate(groupName, groupTags, values) {
      const tags = values.map(v =>
        typeof v === 'string' ? (groupTags.find(t => t.name === v) || { name: v }) : v
      )
      this.onGroupUpdate(groupName, tags)
    },

    // Tri-state helpers — return 'include' | 'exclude' | 'off'
    tagState(groupName, tag) {
      const inIncludes = (this.modelValue[groupName] || []).some(t => t.name === tag.name)
      if (inIncludes) return 'include'
      const inExcludes = (this.modelValueExclude[groupName] || []).some(t => t.name === tag.name)
      if (inExcludes) return 'exclude'
      return 'off'
    },

    cycleTag(groupName, tag) {
      const state = this.tagState(groupName, tag)
      const includes = (this.modelValue[groupName] || []).filter(t => t.name !== tag.name)
      const excludes = (this.modelValueExclude[groupName] || []).filter(t => t.name !== tag.name)
      if (state === 'off') {
        // off → include
        this.$emit('update:modelValue', { ...this.modelValue, [groupName]: [...includes, tag] })
      } else if (state === 'include') {
        // include → exclude
        this.$emit('update:modelValue', { ...this.modelValue, [groupName]: includes })
        this.$emit('update:modelValueExclude', { ...this.modelValueExclude, [groupName]: [...excludes, tag] })
      } else {
        // exclude → off
        this.$emit('update:modelValueExclude', { ...this.modelValueExclude, [groupName]: excludes })
      }
    },

    isGroupNoTag(groupName) {
      return this.noTagGroups.includes(groupName)
    },

    // Toggle the "no tag in this group" flag. Mutually exclusive with includes/excludes
    // for that group: toggling on clears both.
    toggleNoTag(groupName) {
      if (this.isGroupNoTag(groupName)) {
        this.$emit('update:noTagGroups', this.noTagGroups.filter(g => g !== groupName))
      } else {
        // Clear includes/excludes for this group, then add to noTagGroups
        const newIncludes = { ...this.modelValue }
        delete newIncludes[groupName]
        this.$emit('update:modelValue', newIncludes)
        const newExcludes = { ...this.modelValueExclude }
        delete newExcludes[groupName]
        this.$emit('update:modelValueExclude', newExcludes)
        this.$emit('update:noTagGroups', [...this.noTagGroups, groupName])
      }
    },
  },
}
</script>

<style scoped>
.combobox-compact :deep(.v-field__input) {
  opacity: 1 !important;
}
</style>
