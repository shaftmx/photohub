<template>
  <!-- ──────────────────────────────────────────────────────────
       EditTagsDialog — tag editor for a single photo
       Opens as a dialog, loads tags from API, lets the user
       edit the photo's tags, and saves on Apply.
       Used from PhotoDetail via the "Edit tags" button.
       Props:  modelValue (v-model = dialog open/close)
               photo (the photo object currently displayed)
       Emits:  update:modelValue (close dialog)
               tagsUpdated (photo tags were saved, parent should refresh)
  ────────────────────────────────────────────────────────────── -->
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    scrollable
  >
    <v-card>
      <v-toolbar color="primary" density="compact">
        <v-btn icon @click="$emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="text-body-1 font-weight-medium">Edit tags</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          color="white"
          prepend-icon="mdi-check-circle"
          :loading="loading"
          :disabled="!hasChanges"
          @click="doApplyTags()"
        >Apply</v-btn>
      </v-toolbar>

      <!-- Loading state while fetching tag groups -->
      <div v-if="loadingTags" class="d-flex justify-center align-center pa-12">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>

      <v-card-text v-else class="pa-4">
        <!-- stagingTags is the working copy — only saved on Apply -->
        <TagGroupsWidget v-model="stagingTags" :tag-groups="tagGroups" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { useAlertStore } from '../stores/alert'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import TagGroupsWidget from './TagGroupsWidget.vue'

export default {
  name: 'EditTagsDialog',

  components: { TagGroupsWidget },

  props: {
    // v-model: controls dialog visibility
    modelValue: { type: Boolean, default: false },
    // The photo being edited — needs filename and current tags
    photo: { type: Object, default: null },
  },

  emits: ['update:modelValue', 'tagsUpdated'],

  data: () => ({
    tagGroups: [],      // All available tag groups from API
    stagingTags: {},    // Working copy of tags — edited by user, not yet saved
    originalTags: {},   // Snapshot of tags when dialog opened — used to detect changes
    loadingTags: false, // True while fetching tag groups
    loading: false,     // True while saving
  }),

  computed: {
    // Disable Apply button if nothing changed
    hasChanges() {
      return JSON.stringify(this.stagingTags) !== JSON.stringify(this.originalTags)
    },
  },

  watch: {
    // When the dialog opens, load tags first then init staging state
    async modelValue(opened) {
      if (opened && this.photo) {
        await this.doGetTags()
        this.initStagingTags()
      }
    },
  },

  methods: {
    // photo.tags from get_photo: { groupName: { color, tags: [{name, color}] } }
    // Resolve each tag against tagGroups so the objects match exactly what the chips use.
    // v-chip-group uses deepEqual — partial objects from the detail API won't match.
    initStagingTags() {
      const flat = {}
      if (this.photo && this.photo.tags) {
        for (const [groupName, group] of Object.entries(this.photo.tags)) {
          const tagGroup = this.tagGroups.find(g => g.name === groupName)
          flat[groupName] = (group.tags || []).map(t =>
            tagGroup?.tags.find(gt => gt.name === t.name) || t
          )
        }
      }
      this.originalTags = JSON.parse(JSON.stringify(flat))
      this.stagingTags = JSON.parse(JSON.stringify(flat))
    },

    async doGetTags() {
      this.loadingTags = true
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncFetch('/api/tags')
      if (error.value) {
        triggerAlert('error', 'Request failure', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.tagGroups = data.value.data.tag_groups
      }
      this.loadingTags = false
    },

    async doApplyTags() {
      this.loading = true
      const { triggerAlert } = useAlertStore()

      // Reuse the single-photo apply_tags path:
      // send current and staging tags for this one photo so the backend
      // can compute what to add/remove (same logic as TagPhotos single mode)
      const currentPhoto = { ...this.photo, tags: this.flattenTags(this.originalTags) }
      const stagingPhoto = { ...this.photo, tags: this.flattenTags(this.stagingTags) }

      const { data, error } = await useAsyncPost('/api/apply_tags', {
        current_tagged_photos: [currentPhoto],
        staging_tagged_photos: [stagingPhoto],
      })

      if (error.value) {
        triggerAlert('error', 'Tag failure', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        triggerAlert('success', 'Tags saved', '')
        this.$emit('tagsUpdated', this.photo.filename)
        this.$emit('update:modelValue', false)
      }
      this.loading = false
    },

    // Convert { groupName: [tagObj, ...] } → { groupName: [tagName, ...] } for API
    flattenTags(tagsObj) {
      const result = {}
      for (const [groupName, tags] of Object.entries(tagsObj)) {
        if (tags?.length) result[groupName] = tags.map(t => t.name ?? t)
      }
      return result
    },
  },
}
</script>
