<template>
  <!-- Desktop -->
  <template v-if="!isMobile">
    <div class="d-flex align-center ga-2 mb-1">
      <slot name="prepend"></slot>
      <h1 class="text-h4">{{ title }}</h1>
      <slot name="chips"></slot>
      <v-chip v-if="count !== null" size="x-small" variant="tonal" label>{{ count }} photo{{ count !== 1 ? 's' : '' }}</v-chip>
      <v-chip v-if="count !== null && total > count" size="x-small" color="warning" variant="tonal"
        :title="`${total} total — refine your filters to see more`">{{ total }}+ results, showing {{ count }}</v-chip>
    </div>
    <p v-if="subtitle" class="text-body-2 text-medium-emphasis mb-4">{{ subtitle }}</p>
  </template>

  <!-- Mobile -->
  <template v-else>
    <div class="d-flex align-center ga-2 mb-0">
      <slot name="prepend"></slot>
      <h1 class="text-subtitle-1 font-weight-medium my-0">{{ title }}</h1>
    </div>
    <div class="d-flex flex-wrap ga-1 mb-1">
      <slot name="chips"></slot>
      <v-chip v-if="count !== null" size="x-small" variant="tonal" label>{{ count }} photo{{ count !== 1 ? 's' : '' }}</v-chip>
      <v-chip v-if="count !== null && total > count" size="x-small" color="warning" variant="tonal"
        :title="`${total} total — refine your filters to see more`">{{ total }}+ results, showing {{ count }}</v-chip>
    </div>
    <p v-if="subtitle" class="text-caption text-medium-emphasis mb-2">{{ subtitle }}</p>
  </template>
</template>

<script>
export default {
  name: 'PageTitle',
  props: {
    title:    { type: String,  required: true },
    isMobile: { type: Boolean, default: false },
    count:    { type: Number,  default: null },
    total:    { type: Number,  default: 0 },
    subtitle: { type: String,  default: '' },
  },
}
</script>
