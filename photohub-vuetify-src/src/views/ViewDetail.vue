<template>
  <DisplayPhoto
    ref="displayPhoto"
    :paths="paths"
    :photos="photos"
    :view-id="$route.params.id"
    :cover-filename="view.cover_filename"
    :readonly="!authStore.canEdit"
    @photoDeleted="onPhotoDeleted"
    @photoUnpublished="onPhotoUnpublished"
  ></DisplayPhoto>

  <v-sheet class="pa-4" v-if="!loading && !invalidToken && !notFound">

    <!-- Header row -->
    <v-sheet class="d-flex align-center mb-2 ga-2">
      <v-btn v-if="isAuthenticated" icon="mdi-arrow-left" variant="text" density="compact" size="small"
        title="Back to views" @click="$router.push({ name: 'Views' })"></v-btn>
      <span class="text-h6">{{ view.name }}</span>
      <span class="text-caption text-medium-emphasis">{{ photos.length }} photo{{ photos.length !== 1 ? 's' : '' }}</span>
      <v-chip size="x-small" :color="view.public ? 'success' : 'default'" variant="tonal">
        {{ view.public ? 'Public' : 'Private' }}
      </v-chip>
      <v-btn
        :icon="filtersOpen ? 'mdi-tag' : 'mdi-tag-outline'"
        :color="filtersOpen ? 'primary' : 'default'"
        variant="text" density="compact" size="small"
        title="Toggle filters"
        @click="filtersOpen = !filtersOpen"
      ></v-btn>
      <v-btn v-if="view.description"
        :icon="descriptionOpen ? 'mdi-text-box' : 'mdi-text-box-outline'"
        :color="descriptionOpen ? 'primary' : 'default'"
        variant="text" density="compact" size="small"
        :title="descriptionOpen ? 'Hide description' : 'Show description'"
        @click="descriptionOpen = !descriptionOpen"
      ></v-btn>
      <v-spacer></v-spacer>
      <template v-if="authStore.canEdit">
        <!-- Share button (private views only) -->
        <v-menu v-if="!view.public" v-model="shareMenu" :close-on-content-click="false" location="bottom end">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props"
              :icon="view.share_link ? 'mdi-share-variant' : 'mdi-share-variant-outline'"
              :color="view.share_link ? 'primary' : 'default'"
              variant="text" density="compact" size="small"
              title="Share link"
            ></v-btn>
          </template>
          <v-card min-width="380" class="pa-3">
            <div class="d-flex align-center mb-3 gap-2">
              <span class="text-body-2 font-weight-medium">Private share link</span>
              <template v-if="view.share_link && view.share_link_expires_at">
                <v-chip v-if="isExpired" size="x-small" color="error" variant="tonal">Expired</v-chip>
                <v-chip v-else size="x-small" color="warning" variant="tonal">
                  Expires {{ formatExpiry(view.share_link_expires_at) }}
                </v-chip>
              </template>
            </div>

            <template v-if="view.share_link">
              <!-- URL field -->
              <v-text-field
                :model-value="shareUrl"
                density="compact" variant="outlined" readonly hide-details
                class="mb-3" style="font-size: 12px;"
              >
                <template v-slot:append-inner>
                  <v-btn size="x-small" variant="text" :color="copied ? 'success' : 'default'"
                    @click="copyShareLink">
                    <v-icon>{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
                    <v-tooltip activator="parent" location="top">{{ copied ? 'Copied!' : 'Copy link' }}</v-tooltip>
                  </v-btn>
                </template>
              </v-text-field>

              <!-- Expiry -->
              <div class="text-caption text-medium-emphasis mb-1">Expiry</div>
              <ExpiryPicker v-model:preset="expiryPreset" v-model:date="expiryDate" class="mb-2"></ExpiryPicker>
              <v-btn size="small" variant="text" density="compact" color="primary" :loading="savingExpiry" class="mb-3 px-1" @click="saveExpiry">
                <v-icon size="14" class="mr-1">mdi-check</v-icon>Apply
              </v-btn>

              <v-divider class="mb-3"></v-divider>
              <div class="d-flex ga-2">
                <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-refresh"
                  :loading="generatingLink" @click="confirmRegenerate = true">Regenerate</v-btn>
                <v-spacer></v-spacer>
                <v-btn size="small" variant="text" color="error" prepend-icon="mdi-link-off"
                  :loading="revokingLink" @click="revokeShareLink">Revoke</v-btn>
              </div>

              <!-- Regenerate warning -->
              <v-expand-transition>
                <div v-if="confirmRegenerate" class="mt-3 pa-2 rounded" style="background: rgba(var(--v-theme-warning), 0.08);">
                  <p class="text-caption mb-2">This will invalidate the current link. Anyone with the old link will lose access.</p>
                  <div class="d-flex ga-2">
                    <v-btn size="x-small" variant="text" @click="confirmRegenerate = false">Cancel</v-btn>
                    <v-btn size="x-small" variant="tonal" color="warning" :loading="generatingLink"
                      @click="generateShareLink">Confirm</v-btn>
                  </div>
                </div>
              </v-expand-transition>
            </template>

            <template v-else>
              <p class="text-caption text-medium-emphasis mb-3">
                Generate a link to share this private view in read-only mode.
              </p>
              <!-- Expiry picker for new link -->
              <ExpiryPicker v-model:preset="expiryPreset" v-model:date="expiryDate" class="mb-3"></ExpiryPicker>
              <v-btn block variant="tonal" color="primary" prepend-icon="mdi-link-plus"
                :loading="generatingLink" @click="generateShareLink">Generate link</v-btn>
            </template>
          </v-card>
        </v-menu>
        <v-btn icon="mdi-pencil-outline" variant="text" density="compact" size="small"
          @click="$router.push({ name: 'view-edit', params: { id: $route.params.id } })"></v-btn>
        <v-btn icon="mdi-delete-outline" variant="text" density="compact" size="small" color="error"
          @click="confirmDeleteDialog = true"></v-btn>
      </template>
    </v-sheet>

    <!-- Filter chips (collapsible) -->
    <v-expand-transition>
      <v-sheet v-if="filtersOpen" class="d-flex flex-wrap align-center ga-1 mb-2">
        <v-chip v-if="view.filter_mode === 'notags'" size="x-small" color="primary" variant="tonal" prepend-icon="mdi-tag-off-outline">No tags</v-chip>
        <v-chip v-if="view.filter_mode === 'basic'" size="x-small" variant="tonal" prepend-icon="mdi-text-search-variant">Quick</v-chip>
        <v-chip v-if="view.filter_mode === 'smart'" size="x-small" variant="tonal" prepend-icon="mdi-tag-search">Detailed</v-chip>
        <v-chip v-for="tag in view.filter_tags" :key="tag.name" size="x-small" :color="tag.color" variant="tonal">{{ tag.name }}</v-chip>
        <v-chip v-if="view.filter_favorite" size="x-small" color="red" variant="tonal" prepend-icon="mdi-heart">Favorites</v-chip>
        <v-chip v-if="view.filter_rating_value > 0" size="x-small" color="amber" variant="tonal" prepend-icon="mdi-star">
          {{ view.filter_rating_mode === 'eq' ? '=' : '≤' }}{{ view.filter_rating_value }}★
        </v-chip>
      </v-sheet>
    </v-expand-transition>

    <!-- Description (markdown, collapsible) -->
    <v-expand-transition>
      <div v-if="descriptionOpen && view.description">
        <v-divider class="mb-3"></v-divider>
        <div class="markdown-body text-body-2 mb-3" v-html="renderMarkdown(view.description)"></div>
        <v-divider class="mb-2"></v-divider>
      </div>
    </v-expand-transition>

    <!-- Sort + grid size slider -->
    <v-sheet class="d-flex align-center mb-2 ga-2">
      <SortControls v-model:sortBy="sortBy" v-model:sortDir="sortDir" :show-custom-order="view.has_custom_order || false" @update:sortBy="applySort()" @update:sortDir="applySort()"></SortControls>
      <v-spacer></v-spacer>
      <v-sheet class="d-flex align-end justify-end" style="max-width: 300px; width: 50%">
        <v-slider v-model="sharedDatas.gridSize" :max="sharedDatas.gridMax" :min="sharedDatas.gridMin"
          hide-details color="primary" append-icon="mdi-image-size-select-actual"
          density="compact" track-size="2" thumb-size="15">
        </v-slider>
      </v-sheet>
    </v-sheet>

    <!-- Photo grid -->
    <PhotoGrid :photos="photos" :paths="paths" :shared-datas="sharedDatas" :show-favorite="authStore.canEdit"
      @item-click="photo => $refs.displayPhoto.displayPhoto(photo.filename)"
      @toggle-favorite="toggleFavorite">
    </PhotoGrid>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="confirmDeleteDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>Delete "{{ view.name }}"?</v-card-title>
        <v-card-text>This will delete the view definition. Photos are not affected.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" density="compact" @click="confirmDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" density="compact" :loading="deleting" @click="deleteView">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-sheet>

  <v-sheet v-else-if="invalidToken" class="d-flex flex-column align-center justify-center pa-12 ga-4">
    <v-icon size="64" color="medium-emphasis">mdi-link-off</v-icon>
    <span class="text-h6 text-medium-emphasis">This shared link is no longer valid</span>
  </v-sheet>

  <v-sheet v-else-if="notFound" class="d-flex flex-column align-center justify-center pa-12 ga-4">
    <v-icon size="64" color="medium-emphasis">mdi-image-off-outline</v-icon>
    <span class="text-h6 text-medium-emphasis">View not found</span>
    <v-btn variant="tonal" prepend-icon="mdi-arrow-left" @click="$router.push({ name: 'Views' })">Back to views</v-btn>
  </v-sheet>

  <v-sheet v-else class="d-flex justify-center pa-12">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </v-sheet>
</template>

<script setup>
import SortControls from '@/components/SortControls.vue'
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ExpiryPicker from '@/components/ExpiryPicker.vue'
import { useAuthStore } from '../stores/auth.js'
const authStore = useAuthStore()
</script>

<script>
import { marked } from 'marked'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { useAlertStore } from '../stores/alert'
import { getSharedDatas } from '../sharedDatas.js'

export default {
  data: () => ({
    view: {},
    photos: [],
    paths: {},
    loading: true,
    deleting: false,
    sharedDatas: {},
    sortBy: 'date',
    sortDir: 'desc',
    filtersOpen: false,
    descriptionOpen: false,
    isAuthenticated: false,
    invalidToken: false,
    notFound: false,
    // Share link
    shareMenu: false,
    generatingLink: false,
    revokingLink: false,
    copied: false,
    confirmRegenerate: false,
    expiryPreset: null,
    expiryDate: null,
    savingExpiry: false,
    // Delete dialog
    confirmDeleteDialog: false,
  }),

  mounted() {
    this.sharedDatas = getSharedDatas(this)
    this.loadView()
  },

  methods: {
    renderMarkdown(text) {
      return marked.parse(text || '')
    },

    async loadView({ sortBy } = {}) {
      this.loading = true
      const param = this.$route.params.id
      const qs = sortBy ? `?sort_by=${sortBy}` : ''
      const isToken = isNaN(param)
      let result

      if (isToken) {
        // Shared view access via token — no auth needed
        result = await useAsyncFetch(`/api/shared_view/${param}/photos${qs}`)
        if (!result.error.value && !result.data.value?.ERROR) {
          this.isAuthenticated = false
        } else {
          // Invalid or revoked token
          this.loading = false
          this.invalidToken = true
          return
        }
      } else {
        // Normal access by ID — try auth, fallback to public
        result = await useAsyncFetch(`/api/views/${param}/photos${qs}`)
        if (!result.error.value && result.data.value?.ERROR === 'AuthRequired') {
          result = await useAsyncFetch(`/api/public/views/${param}/photos${qs}`)
          if (!result.error.value && !result.data.value?.ERROR) {
            this.isAuthenticated = false
          } else {
            this.$router.push({ name: 'Login', query: { next: this.$route.fullPath } })
            return
          }
        } else if (!result.error.value && !result.data.value?.ERROR) {
          this.isAuthenticated = true
        } else {
          this.loading = false
          this.notFound = true
          return
        }
      }

      this.loading = false
      this.invalidToken = false
      this.notFound = false
      this.view = result.data.value.data.view
      this.photos = result.data.value.data.photos
      this.paths = result.data.value.data.paths
      this.sortBy = sortBy || this.view.sort_by
      this.sortDir = this.view.sort_dir
      if (this.view.share_link_expires_at) {
        const d = new Date(this.view.share_link_expires_at)
        this.expiryPreset = 'custom'
        this.expiryDate = d.toISOString().slice(0, 10)
      }
    },

    async applySort() {
      if (this.sortBy === 'custom') {
        // Reload from API with sort_by=custom override to get the persisted custom order
        await this.loadView({ sortBy: 'custom' })
        return
      }
      const dir = this.sortDir === 'asc' ? 1 : -1
      const field = this.sortBy
      this.photos = [...this.photos].sort((a, b) => {
        if (a[field] < b[field]) return -1 * dir
        if (a[field] > b[field]) return 1 * dir
        return 0
      })
    },

    async toggleFavorite(photo) {
      const newValue = !photo.favorite
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${photo.filename}/update`, { favorite: newValue })
      if (error.value) {
        triggerAlert('error', 'Save error', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        photo.favorite = newValue
      }
    },

    onPhotoDeleted(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
    },

    onPhotoUnpublished(filename) {
      this.photos = this.photos.filter(p => p.filename !== filename)
    },

    async deleteView() {
      this.deleting = true
      const id = this.$route.params.id
      await useAsyncPost(`/api/views/${id}/delete`, {})
      this.deleting = false
      this.$router.push({ name: 'Views' })
    },

    async generateShareLink() {
      this.generatingLink = true
      const id = this.$route.params.id
      const payload = this.expiryIso ? { expires_at: this.expiryIso } : {}
      const { data, error } = await useAsyncPost(`/api/views/${id}/share-link`, payload)
      this.generatingLink = false
      if (!error.value && !data.value?.ERROR) {
        this.view = { ...this.view, share_link: data.value.data.share_link, share_link_expires_at: data.value.data.share_link_expires_at }
        this.copied = false
        this.confirmRegenerate = false
      }
    },

    async saveExpiry() {
      this.savingExpiry = true
      const id = this.$route.params.id
      const { data, error } = await useAsyncPost(`/api/views/${id}/share-link/expiry`, { expires_at: this.expiryIso || null })
      this.savingExpiry = false
      if (!error.value && !data.value?.ERROR) {
        this.view = { ...this.view, share_link_expires_at: data.value.data.share_link_expires_at }
      }
    },

    formatExpiry(isoStr) {
      if (!isoStr) return ''
      const d = new Date(isoStr)
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    },

    async revokeShareLink() {
      this.revokingLink = true
      const id = this.$route.params.id
      const { data, error } = await useAsyncPost(`/api/views/${id}/share-link/revoke`, {})
      this.revokingLink = false
      if (!error.value && !data.value?.ERROR) {
        this.view = { ...this.view, share_link: null }
        this.shareMenu = false
      }
    },

    copyShareLink() {
      navigator.clipboard.writeText(this.shareUrl)
      this.copied = true
      setTimeout(() => { this.copied = false }, 2000)
    },
  },

  computed: {
    shareUrl() {
      return this.view.share_link
        ? `${window.location.origin}/views/${this.view.share_link}`
        : ''
    },
    isExpired() {
      if (!this.view.share_link_expires_at) return false
      return new Date(this.view.share_link_expires_at) < new Date()
    },
    expiryIso() {
      if (!this.expiryPreset) return null
      if (this.expiryPreset === 'custom') {
        if (!this.expiryDate) return null
        return new Date(`${this.expiryDate}T23:59:59`).toISOString()
      }
      const hours = { '1h': 1, '3h': 3, '1d': 24, '1w': 168, '1m': 720 }[this.expiryPreset]
      if (!hours) return null
      const d = new Date()
      d.setHours(d.getHours() + hours)
      return d.toISOString()
    },
  },
}
</script>

<style scoped>
.markdown-body :deep(p) { margin: 0 0 6px; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) { margin: 8px 0 4px; font-weight: 600; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { margin: 4px 0; padding-left: 20px; }
.markdown-body :deep(li) { margin: 2px 0; }
.markdown-body :deep(code) { background: rgba(0,0,0,0.07); border-radius: 3px; padding: 1px 4px; font-size: 0.85em; }
.markdown-body :deep(a) { color: rgb(var(--v-theme-primary)); }

</style>
