<template>
  <router-view />
</template>

<script setup>
  //
</script>

<style>
/* Reduce font size in combobox/autocomplete dropdowns globally */
.combobox-menu .v-list-item {
  font-size: 13px;
  min-height: 32px;
}
.combobox-menu .v-list-item-title {
  font-size: 13px;
}

/* Tag description tooltip — card-style, matches app theme */
.tag-desc-tooltip {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 6px !important;
  font-size: 12px;
  line-height: 1.4;
  padding: 6px 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.12);
  opacity: 1 !important;
}
</style>

