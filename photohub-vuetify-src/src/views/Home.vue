<template>
  <v-sheet class="pa-4">

    <!-- Loading -->
    <v-sheet v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </v-sheet>

    <!-- Empty state -->
    <v-sheet v-else-if="views.length === 0" class="d-flex flex-column align-center pa-12 ga-3">
      <v-icon size="64" color="grey-lighten-1">mdi-image-album</v-icon>
      <span class="text-body-1 text-medium-emphasis">No views yet</span>
      <v-btn v-if="isAuthenticated" color="primary" variant="tonal" prepend-icon="mdi-plus"
        @click="$router.push({ name: 'view-create' })">Create your first view</v-btn>
    </v-sheet>

    <!-- Gallery grid -->
    <div v-else class="gallery-grid">
      <div
        v-for="view in views"
        :key="view.id"
        class="gallery-card"
        @click="$router.push({ name: 'view-detail', params: { id: view.id } })"
      >
        <!-- Cover image -->
        <div class="gallery-cover">
          <img
            v-if="view.cover_filename"
            :src="paths[coverSize] + '/' + view.cover_hash_path + '/' + view.cover_filename"
            class="cover-img"
          />
          <div v-else class="cover-placeholder">
            <v-icon size="64" color="grey-lighten-1">mdi-image-album</v-icon>
          </div>

          <!-- Overlay gradient + name -->
          <div class="cover-overlay">
            <div class="cover-info">
              <div class="cover-name">{{ view.name }}</div>
              <div class="cover-count">{{ view.photo_count }} photo{{ view.photo_count !== 1 ? 's' : '' }}</div>
            </div>
            <!-- Private badges (authenticated only) -->
            <div v-if="isAuthenticated && !view.public" class="cover-badges">
              <v-icon size="14" color="white" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));">mdi-lock</v-icon>
              <v-icon v-if="view.share_link" size="14" color="white" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));">mdi-share-variant</v-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

  </v-sheet>
</template>

<script>
import { useAsyncFetch } from '../reactivefetch.js'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    views: [],
    paths: {},
    loading: false,
    sharedDatas: {},
    isAuthenticated: false,
    deleteDialog: false,
    deleteTarget: null,
    deleting: false,
  }),

  computed: {
    coverSize() {
      return this.sharedDatas.gridPhotoSize || 'xs'
    },
  },

  mounted() {
    this.sharedDatas = getSharedDatas(this)
    this.loadViews()
  },

  methods: {
    async loadViews() {
      this.loading = true
      // Try authenticated endpoint first
      const { data, error } = await useAsyncFetch('/api/views')
      if (!error.value && data.value && !data.value.ERROR) {
        this.isAuthenticated = true
        this.views = (data.value.data.views || []).slice().sort((a, b) => a.name.localeCompare(b.name))
        this.paths = data.value.data.paths
      } else {
        // Not authenticated — load public views only
        this.isAuthenticated = false
        const pub = await useAsyncFetch('/api/public/views')
        if (!pub.error.value && pub.data.value && !pub.data.value.ERROR) {
          this.views = (pub.data.value.data.views || []).slice().sort((a, b) => a.name.localeCompare(b.name))
          this.paths = pub.data.value.data.paths
        }
      }
      this.loading = false
    },

  },
}
</script>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.gallery-card {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.gallery-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.gallery-card:hover .cover-img {
  transform: scale(1.04);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 10px 12px;
  opacity: 0.92;
  transition: opacity 0.2s ease;
}

.gallery-card:hover .cover-overlay {
  opacity: 1;
}

.cover-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.cover-name {
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cover-count {
  color: rgba(255,255,255,0.75);
  font-size: 0.75rem;
  margin-top: 2px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
}

.cover-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}
</style>
