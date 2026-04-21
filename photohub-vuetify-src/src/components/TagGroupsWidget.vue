<template>
  <v-sheet :class="isMobile ? 'd-flex flex-column' : 'd-flex align-content-start flex-wrap'">
    <v-sheet
      v-for="group in filteredTagGroups"
      :key="group.name"
      class="pa-0"
      :class="isMobile ? 'mb-2' : 'mr-2'"
      :style="isMobile ? 'width: 100%' : 'min-width: 18ch'"
    >
      <!-- Group header -->
      <h4 class="d-flex align-center ga-1" style="line-height:1">
        <v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="small"></v-icon>
        {{ group.name }}
        <v-tooltip v-if="group.description" location="right" max-width="260" content-class="tag-desc-tooltip">
          <template #activator="{ props }">
            <v-icon v-bind="props" size="13" class="text-medium-emphasis" style="opacity:0.55; cursor:help; vertical-align:middle">mdi-information-outline</v-icon>
          </template>
          {{ group.description }}
        </v-tooltip>
      </h4>

      <!-- Checkbox chips -->
      <v-chip-group
        v-if="group.type === 'checkbox'"
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
        v-if="group.type === 'combobox' && !allowNew"
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
    // When provided, only tags present on these photos are shown (filter mode).
    // When empty/omitted, all tags from tagGroups are shown (edit mode).
    photos:     { type: Array,   default: () => [] },
    showAll:    { type: Boolean, default: false },
    isMobile:   { type: Boolean, default: false },
    disabled:   { type: Boolean, default: false },
    // false in filter mode: combobox groups become autocomplete (no free entry)
    allowNew:   { type: Boolean, default: true },
  },

  emits: ['update:modelValue'],

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
    onGroupUpdate(groupName, selectedTags) {
      this.$emit('update:modelValue', {
        ...this.modelValue,
        [groupName]: selectedTags,
      })
    },

    // v-combobox can emit either tag objects (picked from list) or strings (typed by user).
    // Normalize both to tag objects.
    onComboUpdate(groupName, groupTags, values) {
      const tags = values.map(v =>
        typeof v === 'string'
          ? (groupTags.find(t => t.name === v) || { name: v })
          : v
      )
      this.onGroupUpdate(groupName, tags)
    },
  },
}
</script>

<style scoped>
.combobox-compact :deep(.v-field__input) {
  opacity: 1 !important;
}
</style>

