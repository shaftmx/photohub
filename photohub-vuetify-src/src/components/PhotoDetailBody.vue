<template>
  <div>
    <!-- Description -->
    <v-textarea :model-value="descriptionModel" label="Description" density="compact" variant="outlined"
      rows="2" auto-grow class="mb-2" hide-details
      @update:model-value="$emit('update:descriptionModel', $event)"
      @blur="$emit('saveDescription')"></v-textarea>
    <p class="text-caption text-medium-emphasis mb-4">Description is saved automatically</p>

    <!-- Tags -->
    <v-divider class="mb-3"></v-divider>
    <div class="d-flex align-center mb-3">
      <v-icon size="small" class="mr-2" color="primary">mdi-tag-multiple</v-icon>
      <span class="text-body-2 font-weight-medium">Tags</span>
      <v-spacer></v-spacer>
      <v-btn size="x-small" variant="tonal" color="primary" prepend-icon="mdi-pencil"
        @click="$emit('editTags', photo.filename)">Edit</v-btn>
    </div>
    <div v-if="Object.keys(photo.tags).length === 0" class="text-caption text-medium-emphasis mb-4 ml-1">
      No tags — click Edit to add some
    </div>
    <div v-else class="rounded-lg mb-4" style="background: rgba(0,0,0,0.04);">
      <div v-for="(group, groupName, index) in photo.tags" :key="groupName"
        class="d-flex align-center px-3 py-2"
        :style="index > 0 ? 'border-top: 1px solid rgba(0,0,0,0.08)' : ''">
        <div class="d-flex align-center mr-3" style="min-width: 90px;">
          <v-icon :color="group.color || 'grey'" icon="mdi-square-rounded" size="x-small" class="mr-1"></v-icon>
          <span class="text-caption text-medium-emphasis">{{ groupName }}</span>
        </div>
        <div class="d-flex flex-wrap ga-1">
          <v-chip v-for="tag in group.tags" :key="tag.name" size="small" variant="tonal" :color="tag.color">{{ tag.name }}</v-chip>
        </div>
      </div>
    </div>

    <!-- Métadonnées -->
    <v-divider class="mb-3"></v-divider>
    <div class="d-flex align-center mb-3">
      <v-icon size="small" class="mr-2" color="primary">mdi-information-outline</v-icon>
      <span class="text-body-2 font-weight-medium">Metadata</span>
    </div>
    <v-list density="compact" class="pa-0 mb-4 rounded-lg" style="background: rgba(0,0,0,0.04);">
      <v-list-item v-if="photo.origin_filename" class="px-3 py-1">
        <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-file-image</v-icon></template>
        <v-list-item-title class="text-caption text-medium-emphasis">Original file</v-list-item-title>
        <v-list-item-subtitle class="text-caption text-truncate">{{ photo.origin_filename }}</v-list-item-subtitle>
      </v-list-item>
      <v-divider v-if="photo.origin_filename"></v-divider>
      <v-list-item class="px-3 py-1">
        <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-calendar</v-icon></template>
        <v-list-item-title class="text-caption text-medium-emphasis">Photo date</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ formatDate(photo.date) }}</v-list-item-subtitle>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item class="px-3 py-1">
        <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-upload</v-icon></template>
        <v-list-item-title class="text-caption text-medium-emphasis">Uploaded on</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ formatDate(photo.upload_date) }}</v-list-item-subtitle>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item class="px-3 py-1">
        <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-account</v-icon></template>
        <v-list-item-title class="text-caption text-medium-emphasis">Owner</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ photo.owner }}</v-list-item-subtitle>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item class="px-3 py-1">
        <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-fingerprint</v-icon></template>
        <v-list-item-title class="text-caption text-medium-emphasis">Filename (md5)</v-list-item-title>
        <v-list-item-subtitle class="text-caption text-truncate" style="font-family: monospace; font-size: 10px;">{{ photo.filename }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>

    <!-- EXIF -->
    <v-divider class="mb-3"></v-divider>
    <div class="d-flex align-center mb-2" style="cursor: pointer;" @click="$emit('update:showExif', !showExif)">
      <v-icon size="small" class="mr-2" color="primary">mdi-camera-iris</v-icon>
      <span class="text-body-2 font-weight-medium">EXIF</span>
      <v-spacer></v-spacer>
      <v-icon size="small">{{ showExif ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </div>
    <v-expand-transition>
      <div v-show="showExif">
        <div v-if="!photo.exif || Object.keys(photo.exif).length === 0" class="text-caption text-medium-emphasis ml-1 mb-4">
          No EXIF data available
        </div>
        <v-list v-else density="compact" class="pa-0 mb-4 rounded-lg" style="background: rgba(0,0,0,0.04);">
          <template v-for="(value, key, index) in photo.exif" :key="key">
            <v-divider v-if="index > 0"></v-divider>
            <v-list-item class="px-3 py-1">
              <v-list-item-title class="text-caption text-medium-emphasis">{{ formatExifKey(key) }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ value }}</v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-list>
      </div>
    </v-expand-transition>
  </div>
</template>

<script>
export default {
  name: 'PhotoDetailBody',

  props: {
    photo: { type: Object, required: true },
    descriptionModel: { type: String, default: '' },
    showExif: { type: Boolean, default: false },
  },

  emits: ['update:descriptionModel', 'update:showExif', 'saveDescription', 'editTags'],

  methods: {
    formatDate(iso) {
      if (!iso) return '—'
      try {
        return new Date(iso).toLocaleString('fr-FR', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      } catch { return iso }
    },

    formatExifKey(key) {
      return key.replace(/([A-Z])/g, ' $1').replace(/^GPS /, 'GPS ').trim()
    },
  },
}
</script>
