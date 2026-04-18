<template>
  <v-sheet class="pa-4">

    <!-- Header -->
    <v-sheet class="d-flex align-center mb-4">
      <span class="text-h6">Views</span>
      <v-spacer></v-spacer>
      <v-btn v-if="authStore.canEdit" color="primary" variant="tonal" density="compact" prepend-icon="mdi-plus"
        :to="{ name: 'view-create' }">New view</v-btn>
    </v-sheet>

    <!-- Loading -->
    <v-sheet v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </v-sheet>

    <!-- Empty state -->
    <v-sheet v-else-if="views.length === 0" class="d-flex flex-column align-center pa-12 ga-3">
      <v-icon size="64" color="grey-lighten-1">mdi-image-album</v-icon>
      <span class="text-body-1 text-medium-emphasis">No views yet</span>
      <v-btn v-if="authStore.canEdit" color="primary" variant="tonal" prepend-icon="mdi-plus"
        :to="{ name: 'view-create' }">Create your first view</v-btn>
    </v-sheet>

    <!-- View cards grid -->
    <div v-else class="views-grid">
      <v-card v-for="view in views" :key="view.id" class="view-card" :ripple="false">
        <!-- Clickable area: cover + name (router-link for middle-click support) -->
        <router-link :to="{ name: 'view-detail', params: { id: view.id } }" class="view-card-link">
          <div class="view-card-cover">
            <img
              v-if="view.cover_filename"
              :src="paths[coverSize] + '/' + view.cover_hash_path + '/' + (view.cover_filename && view.cover_filename.endsWith('.mp4') ? view.cover_filename.replace('.mp4', '.jpg') : view.cover_filename)"
              class="cover-img"
            />
            <div v-else class="cover-placeholder">
              <v-icon size="48" color="grey-lighten-1">mdi-image-album</v-icon>
            </div>
            <!-- Private lock + share indicator -->
            <div v-if="!view.public" class="cover-badges">
              <v-icon size="14" color="white" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));">mdi-lock</v-icon>
              <v-icon v-if="view.share_link" size="14" color="white" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));">mdi-share-variant</v-icon>
            </div>
          </div>
          <div class="pa-2">
            <div class="text-body-1 font-weight-medium text-truncate">{{ view.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ view.photo_count }} photo{{ view.photo_count !== 1 ? 's' : '' }}</div>
          </div>
        </router-link>

        <!-- Action buttons: outside the link, never trigger navigation -->
        <div v-if="authStore.canEdit" class="card-actions d-flex ga-1">
          <v-btn icon="mdi-pencil-outline" variant="text" density="compact" size="x-small" class="action-btn"
            :to="{ name: 'view-edit', params: { id: view.id } }"></v-btn>
          <v-btn icon="mdi-delete-outline" variant="text" density="compact" size="x-small" color="error" class="action-btn"
            @click="confirmDelete(view)"></v-btn>
        </div>
      </v-card>
    </div>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="deleteDialog" max-width="380" persistent>
      <v-card>
        <v-card-title>Delete "{{ deleteTarget?.name }}"?</v-card-title>
        <v-card-text>This will delete the view definition. Photos are not affected.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" density="compact" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" density="compact" :loading="deleting" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-sheet>
</template>

<script>
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { requireAuth } from '../authrequired.js'
import { getSharedDatas } from '../sharedDatas.js'
import { useAuthStore } from '../stores/auth.js'

export default {
  setup() { return { authStore: useAuthStore() } },
  data: () => ({
    views: [],
    paths: {},
    loading: false,
    sharedDatas: {},
    deleteDialog: false,
    deleteTarget: null,
    deleting: false,
  }),

  computed: {
    coverSize() {
      // Use the smallest available sample for card covers
      return this.sharedDatas.gridPhotoSize || 'xs'
    },
  },

  mounted() {
    requireAuth(this)
    this.sharedDatas = getSharedDatas(this)
    this.loadViews()
  },

  methods: {
    async loadViews() {
      this.loading = true
      const { data, error } = await useAsyncFetch('/api/views')
      this.loading = false
      if (error.value) return
      this.views = (data.value.data.views || []).slice().sort((a, b) => a.name.localeCompare(b.name))
      this.paths = data.value.data.paths
    },

    confirmDelete(view) {
      this.deleteTarget = view
      this.deleteDialog = true
    },

    async doDelete() {
      this.deleting = true
      await useAsyncPost(`/api/views/${this.deleteTarget.id}/delete`, {})
      this.deleting = false
      this.views = this.views.filter(v => v.id !== this.deleteTarget.id)
      this.deleteDialog = false
      this.deleteTarget = null
    },
  },
}
</script>

<style scoped>
.views-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.view-card {
  cursor: pointer;
  position: relative;
}

.view-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.view-card .card-actions {
  position: absolute;
  bottom: 8px;
  right: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.view-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  transition: transform 0.15s ease;
}

.action-btn:hover {
  transform: scale(1.25);
}

.view-card-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-badges {
  position: absolute;
  bottom: 4px;
  left: 4px;
  display: flex;
  gap: 4px;
}
</style>
