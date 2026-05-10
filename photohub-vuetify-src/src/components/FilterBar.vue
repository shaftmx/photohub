<template>
  <v-sheet class="mb-2">
    <!-- Single filter row -->
    <div class="d-flex align-center ga-2 mb-2">
      <v-btn-toggle
        :model-value="filterTagMode"
        density="compact" variant="outlined" color="primary" mandatory
        @update:model-value="$emit('update:filterTagMode', $event); $emit('change')"
      >
        <v-btn value="none" :size="isMobile ? 'x-small' : 'small'">
          <v-icon :size="isMobile ? 14 : 18">mdi-filter-off-outline</v-icon>
          <v-tooltip activator="parent" location="top">No filter</v-tooltip>
        </v-btn>
        <v-btn value="quick" :size="isMobile ? 'x-small' : 'small'">
          <v-icon :size="isMobile ? 14 : 18">mdi-text-search-variant</v-icon>
          <v-tooltip activator="parent" location="top">Quick filter</v-tooltip>
        </v-btn>
        <v-btn value="detail" :size="isMobile ? 'x-small' : 'small'">
          <v-icon :size="isMobile ? 14 : 18">mdi-tag-search</v-icon>
          <v-tooltip activator="parent" location="top">Detailed filter</v-tooltip>
        </v-btn>
        <v-btn value="notags" :size="isMobile ? 'x-small' : 'small'">
          <v-icon :size="isMobile ? 14 : 18">mdi-tag-off-outline</v-icon>
          <v-tooltip activator="parent" location="top">No tags</v-tooltip>
        </v-btn>
      </v-btn-toggle>

      <!-- Tag scope toggle (optional, Photos only) -->
      <v-btn
        v-if="showTagScope && filterTagMode !== 'notags' && filterTagMode !== 'none'"
        :icon="showAllTags ? 'mdi-tag-multiple' : 'mdi-tag-search'"
        :color="showAllTags ? 'primary' : 'default'"
        :variant="showAllTags ? 'tonal' : 'text'"
        density="compact" size="small"
        :title="showAllTags ? 'Showing all tags — click to show selection only' : 'Showing selection tags — click to show all'"
        @click="$emit('update:showAllTags', !showAllTags)"
      ></v-btn>

      <!-- AND/OR toggle for quick filter — visible only in quick mode -->
      <v-btn
        v-if="filterTagMode === 'quick'"
        :icon="filterTagOr ? 'mdi-vector-union' : 'mdi-vector-intersection'"
        :color="filterTagOr ? 'primary' : 'default'"
        :variant="filterTagOr ? 'tonal' : 'text'"
        density="compact" size="small"
        :title="filterTagOr ? 'Match ANY selected tag (OR) — click for ALL' : 'Match ALL selected tags (AND) — click for ANY'"
        @click="$emit('update:filterTagOr', !filterTagOr); $emit('change')"
      ></v-btn>

      <v-spacer v-if="isMobile"></v-spacer>
      <v-divider v-else vertical style="height: 24px; align-self: center;"></v-divider>

      <!-- Favorite + rating grouped -->
      <div class="d-flex align-center">
        <v-btn
          :icon="filterFavorite ? 'mdi-heart' : 'mdi-heart-outline'"
          :color="filterFavorite ? 'red' : 'default'"
          :variant="filterFavorite ? 'tonal' : 'text'"
          density="compact" size="small"
          :title="filterFavorite ? 'Favorites only — click to remove' : 'Filter by favorites'"
          @click="$emit('update:filterFavorite', !filterFavorite); $emit('change')"
        ></v-btn>
        <v-btn
          v-for="star in 5" :key="star"
          :icon="star <= filterRating ? 'mdi-star' : 'mdi-star-outline'"
          :color="star <= filterRating ? 'amber' : 'default'"
          variant="text" density="compact" size="x-small"
          :title="star + ' star' + (star > 1 ? 's' : '')"
          @click="$emit('update:filterRating', star === filterRating ? 0 : star); $emit('change')"
        ></v-btn>
        <span
          v-if="filterRating > 0"
          class="rating-mode-toggle text-primary font-weight-bold"
          title="Toggle: <= rating or exactly equal"
          @click="$emit('update:filterRatingMode', filterRatingMode === 'lte' ? 'eq' : 'lte'); $emit('change')"
        >{{ filterRatingMode === 'lte' ? '≤' : '=' }}</span>
      </div>

      <v-divider vertical style="height: 24px; align-self: center;"></v-divider>

      <!-- Media type: photo / video (click active = deselect = all) -->
      <v-btn
        icon="mdi-image"
        :color="mediaType === 'photo' ? 'primary' : 'default'"
        :variant="mediaType === 'photo' ? 'tonal' : 'text'"
        density="compact" size="small"
        title="Photos only"
        @click="$emit('update:mediaType', mediaType === 'photo' ? 'all' : 'photo'); $emit('change')"
      ></v-btn>
      <v-btn
        icon="mdi-video"
        :color="mediaType === 'video' ? 'primary' : 'default'"
        :variant="mediaType === 'video' ? 'tonal' : 'text'"
        density="compact" size="small"
        title="Videos only"
        @click="$emit('update:mediaType', mediaType === 'video' ? 'all' : 'video'); $emit('change')"
      ></v-btn>

      <!-- Orphan filter (Photos only) — photos in no view -->
      <template v-if="showOrphanFilter">
        <v-divider vertical style="height: 24px; align-self: center;"></v-divider>
        <v-btn
          :icon="filterOrphan ? 'mdi-image-broken-variant' : 'mdi-image-broken'"
          :color="filterOrphan ? 'warning' : 'default'"
          :variant="filterOrphan ? 'tonal' : 'text'"
          density="compact" size="small"
          :title="filterOrphan ? 'Orphan photos only — click to remove' : 'Show orphan photos (in no view)'"
          @click="$emit('update:filterOrphan', !filterOrphan); $emit('change')"
        ></v-btn>
      </template>

      <!-- Owner filter (optional, hidden until backend support) -->
      <template v-if="showOwnerFilter">
        <v-divider vertical style="height: 24px; align-self: center;"></v-divider>
        <v-menu v-model="ownerMenu" :close-on-content-click="false" location="bottom start">
          <template #activator="{ props }">
            <v-btn v-bind="props"
              icon="mdi-account"
              :color="filterOwners.length > 0 ? 'primary' : 'default'"
              :variant="filterOwners.length > 0 ? 'tonal' : 'text'"
              density="compact" size="small"
              title="Filter by owner"
            ></v-btn>
          </template>
          <v-card min-width="180">
            <v-list density="compact" select-strategy="leaf" :selected="filterOwners"
              @update:selected="$emit('update:filterOwners', $event); $emit('change')">
              <v-list-item v-for="owner in availableOwners" :key="owner" :value="owner">
                <template #prepend="{ isSelected }">
                  <v-checkbox-btn :model-value="isSelected" density="compact" class="mr-2"></v-checkbox-btn>
                </template>
                <v-list-item-title>{{ owner }}</v-list-item-title>
              </v-list-item>
            </v-list>
            <v-card-actions v-if="filterOwners.length > 0" class="pt-0">
              <v-btn size="small" variant="text" @click="$emit('update:filterOwners', []); $emit('change')">Clear</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </template>
    </div>

    <!-- Tag area: show/hide toggle + active chips (detail mode) -->
    <div v-if="filterTagMode === 'detail'" class="d-flex flex-wrap align-center ga-1 mb-1">
      <v-btn
        :append-icon="filterPanelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        variant="tonal" color="primary" density="compact" size="small"
        @click="filterPanelOpen = !filterPanelOpen"
      >{{ filterPanelOpen ? 'Hide filters' : 'Show filters' }}</v-btn>
      <!-- Clear-all button — only visible when there's something to clear -->
      <v-btn
        v-if="hasActiveTagFilters"
        icon="mdi-filter-remove-outline"
        variant="text" density="compact" size="small"
        title="Clear all tag filters (includes, excludes, no-tag toggles)"
        @click="clearAllTagFilters"
      ></v-btn>
      <template v-if="!filterPanelOpen">
        <!-- Includes -->
        <v-chip v-for="tag in activeDetailTags" :key="'inc-' + tag"
          size="x-small" color="secondary" closable
          @click:close="removeDetailTag(tag)">{{ tag }}</v-chip>
        <!-- Excludes (strikethrough + minus icon) -->
        <v-chip v-for="tag in activeDetailExcludeTags" :key="'exc-' + tag"
          size="x-small" color="secondary" closable
          prepend-icon="mdi-minus-circle"
          style="text-decoration: line-through;"
          @click:close="removeDetailExcludeTag(tag)">{{ tag }}</v-chip>
        <!-- No-tag-in-group toggles -->
        <v-chip v-for="g in noTagGroups" :key="'no-' + g"
          size="x-small" variant="outlined" closable
          prepend-icon="mdi-tag-off-outline"
          @click:close="removeNoTagGroup(g)">{{ g }}: none</v-chip>
      </template>
    </div>

    <!-- Quick filter: tag autocomplete -->
    <v-autocomplete v-if="filterTagMode === 'quick'"
      prepend-icon="mdi-text-search-variant"
      return-object closable-chips
      :model-value="filterQuick"
      item-title="name"
      :items="availableTagsGrouped"
      chips clearable multiple density="compact" hide-details
      direction="horizontal" variant="solo-inverted"
      :chip-props="{ size: 'x-small', density: 'compact' }"
      style="max-width: 600px; min-width: 180px"
      @update:model-value="$emit('update:filterQuick', $event); $emit('change')"
    ></v-autocomplete>

    <!-- Detailed filter panel (collapsible) -->
    <v-expand-transition>
      <div v-if="filterTagMode === 'detail' && filterPanelOpen" class="filter-panel pl-3 mt-1">
        <TagGroupsWidget
          :model-value="filterDetail"
          :model-value-exclude="filterDetailExclude"
          :no-tag-groups="noTagGroups"
          :tag-groups="tagGroups"
          :photos="showAllTags ? [] : photos"
          :show-all="showAllTags"
          :is-mobile="isMobile"
          :allow-new="false"
          :enable-exclude="true"
          @update:modelValue="$emit('update:filterDetail', $event); $emit('change')"
          @update:modelValueExclude="$emit('update:filterDetailExclude', $event); $emit('change')"
          @update:noTagGroups="$emit('update:noTagGroups', $event); $emit('change')"
        />
      </div>
    </v-expand-transition>
  </v-sheet>
</template>

<script>
import TagGroupsWidget from '@/components/TagGroupsWidget.vue'

export default {
  name: 'FilterBar',
  components: { TagGroupsWidget },

  props: {
    filterTagMode:   { type: String,  default: 'quick' },
    filterFavorite:  { type: Boolean, default: false },
    filterRating:    { type: Number,  default: 0 },
    filterRatingMode:{ type: String,  default: 'lte' },
    mediaType:       { type: String,  default: 'all' },
    filterQuick:     { type: Array,   default: () => [] },
    filterDetail:    { type: Object,  default: () => ({}) },
    availableTagsFlat: { type: Array, default: () => [] },
    tagGroups:       { type: Array,   default: () => [] },
    photos:          { type: Array,   default: () => [] },
    isMobile:        { type: Boolean, default: false },
    // Tag scope (Photos only)
    showTagScope:    { type: Boolean, default: false },
    showAllTags:     { type: Boolean, default: true },
    // Owner filter (Photos only)
    showOwnerFilter: { type: Boolean, default: false },
    filterOwners:    { type: Array,   default: () => [] },
    availableOwners: { type: Array,   default: () => [] },
    // Orphan filter (Photos only) — heavy, intentionally not persisted on a View
    showOrphanFilter:{ type: Boolean, default: false },
    filterOrphan:    { type: Boolean, default: false },
    // Quick filter AND/OR toggle — only meaningful when filterTagMode === 'quick'.
    // false = AND (must have all tags), true = OR (must have at least one).
    filterTagOr:     { type: Boolean, default: false },
    // Detail filter — exclude tags state (mirrors filterDetail shape: { groupName: [tag, ...] })
    filterDetailExclude: { type: Object, default: () => ({}) },
    // Detail filter — list of group names where "no tag in this group" is active
    noTagGroups:     { type: Array,   default: () => [] },
  },

  emits: [
    'update:filterTagMode', 'update:filterFavorite', 'update:filterRating',
    'update:filterRatingMode', 'update:mediaType', 'update:filterQuick',
    'update:filterDetail', 'update:showAllTags', 'update:filterOwners',
    'update:filterOrphan', 'update:filterTagOr',
    'update:filterDetailExclude', 'update:noTagGroups',
    'change',
  ],

  data: () => ({
    filterPanelOpen: false,
    ownerMenu: false,
  }),

  computed: {
    activeDetailTags() {
      const tags = []
      Object.values(this.filterDetail).forEach(arr => arr.forEach(t => tags.push(t.name)))
      return tags
    },

    activeDetailExcludeTags() {
      const tags = []
      Object.values(this.filterDetailExclude).forEach(arr => arr.forEach(t => tags.push(t.name)))
      return tags
    },

    hasActiveTagFilters() {
      return this.activeDetailTags.length > 0
        || this.activeDetailExcludeTags.length > 0
        || this.noTagGroups.length > 0
    },

    // Tags grouped by tag_group with a subheader (group name) and a divider
    // between groups. Subheaders & dividers are non-selectable list items
    // handled natively by v-list/v-autocomplete and filtered out on search.
    availableTagsGrouped() {
      const grouped = new Map()
      for (const tag of this.availableTagsFlat || []) {
        const g = tag.group_name || 'Other'
        if (!grouped.has(g)) grouped.set(g, [])
        grouped.get(g).push(tag)
      }
      const items = []
      let first = true
      for (const [groupName, tags] of grouped.entries()) {
        if (!first) items.push({ type: 'divider' })
        items.push({ type: 'subheader', name: groupName })
        items.push(...tags)
        first = false
      }
      return items
    },
  },

  methods: {
    removeDetailTag(tagName) {
      const updated = {}
      Object.entries(this.filterDetail).forEach(([group, tags]) => {
        const filtered = tags.filter(t => t.name !== tagName)
        if (filtered.length) updated[group] = filtered
      })
      this.$emit('update:filterDetail', updated)
      this.$emit('change')
    },

    removeDetailExcludeTag(tagName) {
      const updated = {}
      Object.entries(this.filterDetailExclude).forEach(([group, tags]) => {
        const filtered = tags.filter(t => t.name !== tagName)
        if (filtered.length) updated[group] = filtered
      })
      this.$emit('update:filterDetailExclude', updated)
      this.$emit('change')
    },

    removeNoTagGroup(groupName) {
      this.$emit('update:noTagGroups', this.noTagGroups.filter(g => g !== groupName))
      this.$emit('change')
    },

    // Clear all tag-related filters in detail mode (includes, excludes, no-tag toggles).
    // Other filters (favorite, rating, media type) are unaffected.
    clearAllTagFilters() {
      this.$emit('update:filterDetail', {})
      this.$emit('update:filterDetailExclude', {})
      this.$emit('update:noTagGroups', [])
      this.$emit('change')
    },
  },
}
</script>

<style scoped>
.rating-mode-toggle {
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
  user-select: none;
}
.rating-mode-toggle:hover {
  opacity: 0.7;
}
.filter-panel {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.4);
}
</style>
