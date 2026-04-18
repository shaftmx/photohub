<template>
  <DisplayPhoto
    ref="displayPhoto"
    :paths="paths"
    :photos="photos"
    :view-id="isUploadMode ? undefined : $route.params.id"
    :cover-filename="view.cover_filename"
    :readonly="!authStore.canEdit || isUploadMode"
    :photo-detail-endpoint="photoDetailEndpoint"
    @photoDeleted="onPhotoDeleted"
    @photoUnpublished="onPhotoUnpublished"
  ></DisplayPhoto>

  <v-sheet class="pa-4" v-if="!loading && !invalidToken && !notFound">

    <!-- Header row -->
    <v-sheet class="d-flex align-center mb-2 ga-2">
      <v-btn v-if="isAuthenticated && !isUploadMode" icon="mdi-arrow-left" variant="text" density="compact" size="small"
        title="Back to views" :to="{ name: 'Views' }"></v-btn>
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

      <!-- Map button (all modes) -->
      <v-tooltip text="Map view" location="bottom">
        <template #activator="{ props: tp }">
          <v-btn v-bind="tp" icon="mdi-map-outline" variant="text" density="compact" size="small"
            @click="$refs.viewMap.open()"></v-btn>
        </template>
      </v-tooltip>

      <!-- Upload mode: Upload button -->
      <template v-if="isUploadMode">
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-upload" @click="uploadDialog = true">
          Upload
        </v-btn>
      </template>

      <!-- Normal mode: auth controls -->
      <template v-else-if="authStore.canEdit">
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
              <ExpiryPicker v-model:preset="expiryPreset" v-model:date="expiryDate" class="mb-3"></ExpiryPicker>
              <v-btn block variant="tonal" color="primary" prepend-icon="mdi-link-plus"
                :loading="generatingLink" @click="generateShareLink">Generate link</v-btn>
            </template>

            <!-- Upload link section (collapsible, requires share link) -->
            <v-divider class="mt-3 mb-2"></v-divider>
            <div class="d-flex align-center" :style="view.share_link ? 'cursor: pointer' : 'opacity: 0.5'" @click="view.share_link && (uploadLinkOpen = !uploadLinkOpen)">
              <v-icon size="16" class="mr-1" :color="view.upload_link ? 'primary' : 'default'">mdi-upload-outline</v-icon>
              <span class="text-body-2">Upload link</span>
              <v-chip v-if="view.upload_link" size="x-small" color="primary" variant="tonal" class="ml-2">Active</v-chip>
              <v-spacer></v-spacer>
              <v-icon size="18">{{ uploadLinkOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </div>
            <v-expand-transition>
              <div v-if="uploadLinkOpen && view.share_link" class="mt-3">
                <template v-if="view.upload_link">
                  <v-text-field
                    :model-value="uploadUrl"
                    density="compact" variant="outlined" readonly hide-details
                    class="mb-3" style="font-size: 12px;"
                  >
                    <template v-slot:append-inner>
                      <v-btn size="x-small" variant="text" :color="uploadCopied ? 'success' : 'default'"
                        @click="copyUploadLink">
                        <v-icon>{{ uploadCopied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
                        <v-tooltip activator="parent" location="top">{{ uploadCopied ? 'Copied!' : 'Copy link' }}</v-tooltip>
                      </v-btn>
                    </template>
                  </v-text-field>
                  <div class="d-flex ga-2">
                    <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-refresh"
                      :loading="generatingUploadLink" @click="confirmRevokeUpload = true">Regenerate</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn size="small" variant="text" color="error" prepend-icon="mdi-link-off"
                      :loading="revokingUploadLink" @click="revokeUploadLink">Revoke</v-btn>
                  </div>
                  <v-expand-transition>
                    <div v-if="confirmRevokeUpload" class="mt-3 pa-2 rounded" style="background: rgba(var(--v-theme-warning), 0.08);">
                      <p class="text-caption mb-2">This will invalidate the current upload link.</p>
                      <div class="d-flex ga-2">
                        <v-btn size="x-small" variant="text" @click="confirmRevokeUpload = false">Cancel</v-btn>
                        <v-btn size="x-small" variant="tonal" color="warning" :loading="generatingUploadLink"
                          @click="generateUploadLink">Confirm</v-btn>
                      </div>
                    </div>
                  </v-expand-transition>
                </template>
                <template v-else>
                  <p class="text-caption text-medium-emphasis mb-3">
                    Generate a link to let guests upload photos to this view. Inherits the share link expiry.
                  </p>
                  <v-btn block variant="tonal" color="primary" prepend-icon="mdi-link-plus"
                    :loading="generatingUploadLink" @click="generateUploadLink">Generate upload link</v-btn>
                </template>
              </div>
            </v-expand-transition>
          </v-card>
        </v-menu>

        <!-- Download ZIP -->
        <v-menu v-if="isAuthenticated" v-model="downloadMenu" :close-on-content-click="true" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-tooltip text="Download ZIP" location="bottom">
              <template #activator="{ props: tooltipProps }">
                <v-btn v-bind="{ ...menuProps, ...tooltipProps }" icon="mdi-download-outline" variant="text" density="compact" size="small"></v-btn>
              </template>
            </v-tooltip>
          </template>
          <v-card min-width="180">
            <v-list density="compact" nav>
              <v-list-subheader>Download ZIP</v-list-subheader>
              <v-list-item v-for="size in downloadSizes" :key="size.key" :title="size.label"
                @click="downloadZip(size.key)">
                <template #prepend><v-icon size="18">mdi-folder-zip-outline</v-icon></template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
        <v-btn icon="mdi-pencil-outline" variant="text" density="compact" size="small"
          :to="{ name: 'view-edit', params: { id: $route.params.id } }"></v-btn>
        <v-btn icon="mdi-delete-outline" variant="text" density="compact" size="small" color="error"
          @click="confirmDeleteDialog = true"></v-btn>
      </template>
    </v-sheet>

    <!-- Filter chips (collapsible, normal mode only) -->
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
      <SortControls v-model:sortBy="sortBy" v-model:sortDir="sortDir"
        :show-custom-order="!isUploadMode && (view.has_custom_order || false)"
        @update:sortBy="applySort()" @update:sortDir="applySort()">
      </SortControls>
      <v-spacer></v-spacer>
      <v-sheet class="d-flex align-end justify-end" style="max-width: 300px; width: 50%">
        <v-slider v-model="sharedDatas.gridSize" :max="sharedDatas.gridMax" :min="sharedDatas.gridMin"
          hide-details color="primary" append-icon="mdi-image-size-select-actual"
          density="compact" track-size="2" thumb-size="15">
        </v-slider>
      </v-sheet>
    </v-sheet>

    <!-- Photo grid -->
    <PhotoGrid :photos="photos" :paths="paths" :shared-datas="sharedDatas" :show-favorite="authStore.canEdit && !isUploadMode"
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

    <!-- Upload dialog (upload mode only) -->
    <v-dialog v-if="isUploadMode" v-model="uploadDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          Upload to "{{ view.name }}"
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeUploadDialog"></v-btn>
        </v-card-title>
        <v-card-text>
          <v-form ref="uploadForm" v-model="uploadFormValid" @submit.prevent="onUploadSubmit">
            <v-file-input v-model="uploadFiles" :rules="[v => !!v?.length || 'Required']" :readonly="uploading"
              accept="image/jpeg" multiple label="Select photos" prepend-icon="mdi-camera"
              chips show-size counter variant="solo"></v-file-input>
            <div v-if="uploadedCount > 0" class="mt-3">
              <v-progress-linear :model-value="uploadProgress" color="primary" rounded height="6" class="mb-2"></v-progress-linear>
              <span class="text-caption text-medium-emphasis">{{ uploadedCount }} / {{ uploadTotalFiles }} uploaded</span>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeUploadDialog" :disabled="uploading">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="uploading" :disabled="!uploadFormValid" @click="onUploadSubmit">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upload success dialog -->
    <v-dialog v-if="isUploadMode" v-model="uploadSuccessDialog" max-width="380">
      <v-card>
        <v-card-text class="d-flex flex-column align-center pa-8 ga-3">
          <v-icon size="48" color="success">mdi-check-circle-outline</v-icon>
          <span class="text-body-1 font-weight-medium">{{ lastUploadedCount }} photo{{ lastUploadedCount !== 1 ? 's' : '' }} uploaded</span>
          <span class="text-caption text-medium-emphasis">They will appear in the view once reviewed.</span>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="tonal" @click="uploadSuccessDialog = false; loadView()">Go to view</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-sheet>

  <v-sheet v-else-if="invalidToken" class="d-flex flex-column align-center justify-center pa-12 ga-4">
    <v-icon size="64" color="medium-emphasis">mdi-link-off</v-icon>
    <span class="text-h6 text-medium-emphasis">{{ isUploadMode ? 'This upload link is invalid or has expired.' : 'This shared link is no longer valid' }}</span>
  </v-sheet>

  <v-sheet v-else-if="notFound" class="d-flex flex-column align-center justify-center pa-12 ga-4">
    <v-icon size="64" color="medium-emphasis">mdi-image-off-outline</v-icon>
    <span class="text-h6 text-medium-emphasis">View not found</span>
    <v-btn variant="tonal" prepend-icon="mdi-arrow-left" :to="{ name: 'Views' }">Back to views</v-btn>
  </v-sheet>

  <v-sheet v-else class="d-flex justify-center pa-12">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </v-sheet>

  <ViewMap ref="viewMap" :map-endpoint="mapEndpoint" :photo-detail-endpoint="photoDetailEndpoint"></ViewMap>
</template>

<script setup>
import SortControls from '@/components/SortControls.vue'
import DisplayPhoto from '@/components/DisplayPhoto.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ExpiryPicker from '@/components/ExpiryPicker.vue'
import ViewMap from '@/components/ViewMap.vue'
import { useAuthStore } from '../stores/auth.js'
const authStore = useAuthStore()
</script>

<script>
import { marked } from 'marked'
import { useAsyncFetch, useAsyncPost, useAsyncUploadFile } from '../reactivefetch.js'
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
    // Download
    downloadMenu: false,
    // Upload link management
    uploadLinkOpen: false,
    generatingUploadLink: false,
    revokingUploadLink: false,
    uploadCopied: false,
    confirmRevokeUpload: false,
    // Upload mode (guest upload)
    uploadDialog: false,
    uploadFormValid: false,
    uploadFiles: [],
    uploading: false,
    uploadedCount: 0,
    uploadTotalFiles: 0,
    uploadProgress: 0,
    uploadSuccessDialog: false,
    lastUploadedCount: 0,
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
      const qs = sortBy ? `?sort_by=${sortBy}` : ''
      let result

      if (this.isUploadMode) {
        const token = this.$route.params.token
        result = await useAsyncFetch(`/api/upload_view/${token}/photos${qs}`)
        if (result.error.value || result.data.value?.ERROR) {
          this.loading = false
          this.invalidToken = true
          return
        }
        this.isAuthenticated = false
      } else {
        const param = this.$route.params.id
        const isToken = isNaN(param)

        if (isToken) {
          result = await useAsyncFetch(`/api/shared_view/${param}/photos${qs}`)
          if (!result.error.value && !result.data.value?.ERROR) {
            this.isAuthenticated = false
          } else {
            this.loading = false
            this.invalidToken = true
            return
          }
        } else {
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

    downloadZip(size) {
      const id = this.$route.params.id
      window.location.href = `/api/views/${id}/download?size=${size}`
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
        this.view = { ...this.view, share_link: null, share_link_expires_at: null, upload_link: null }
        this.shareMenu = false
        this.uploadLinkOpen = false
      }
    },

    copyShareLink() {
      navigator.clipboard.writeText(this.shareUrl)
      this.copied = true
      setTimeout(() => { this.copied = false }, 2000)
    },

    async generateUploadLink() {
      this.generatingUploadLink = true
      const id = this.$route.params.id
      const { data, error } = await useAsyncPost(`/api/views/${id}/upload-link`, {})
      this.generatingUploadLink = false
      if (!error.value && !data.value?.ERROR) {
        this.view = { ...this.view, upload_link: data.value.data.upload_link }
        this.uploadCopied = false
        this.confirmRevokeUpload = false
      }
    },

    async revokeUploadLink() {
      this.revokingUploadLink = true
      const id = this.$route.params.id
      const { data, error } = await useAsyncPost(`/api/views/${id}/upload-link/revoke`, {})
      this.revokingUploadLink = false
      if (!error.value && !data.value?.ERROR) {
        this.view = { ...this.view, upload_link: null }
        this.uploadLinkOpen = false
      }
    },

    copyUploadLink() {
      navigator.clipboard.writeText(this.uploadUrl)
      this.uploadCopied = true
      setTimeout(() => { this.uploadCopied = false }, 2000)
    },

    closeUploadDialog() {
      if (this.uploading) return
      this.uploadDialog = false
      this.uploadFiles = []
      this.uploadedCount = 0
      this.uploadProgress = 0
    },

    async onUploadSubmit() {
      if (!this.uploadFormValid || this.uploading) return
      const { triggerAlert } = useAlertStore()
      const token = this.$route.params.token
      this.uploading = true
      this.uploadedCount = 0
      this.uploadTotalFiles = this.uploadFiles.length
      this.uploadProgress = 0

      for (let i = 0; i < this.uploadFiles.length; i++) {
        const file = this.uploadFiles[i]
        const formData = new FormData()
        formData.append('picture.jpg', file)
        const { data, error } = await useAsyncUploadFile(`/api/upload_view/${token}/upload`, formData)
        if (error.value || data.value?.ERROR) {
          triggerAlert('error', `Upload failed: ${file.name}`, '')
          this.uploading = false
          return
        }
        this.uploadedCount++
        this.uploadProgress = Math.round((100 * this.uploadedCount) / this.uploadTotalFiles)
      }

      this.lastUploadedCount = this.uploadedCount
      this.uploading = false
      this.uploadDialog = false
      this.uploadFiles = []
      this.uploadedCount = 0
      this.uploadProgress = 0
      this.uploadSuccessDialog = true
    },
  },

  computed: {
    isUploadMode() {
      return this.$route.name === 'upload-view'
    },
    photoDetailEndpoint() {
      if (this.isUploadMode) return `/api/token/${this.$route.params.token}/photos`
      const param = this.$route.params.id
      if (isNaN(param)) return `/api/token/${param}/photos`
      if (!this.isAuthenticated) return `/api/public/views/${param}/photos`
      return null
    },
    mapEndpoint() {
      if (this.isUploadMode) return `/api/token/${this.$route.params.token}/map`
      const param = this.$route.params.id
      if (isNaN(param)) return `/api/token/${param}/map`
      if (!this.isAuthenticated) return `/api/public/views/${param}/map`
      return `/api/views/${param}/map`
    },
    downloadSizes() {
      const sizes = Object.keys(this.paths).filter(k => k !== '_sizes' && k !== 'raw')
      const sizeMeta = this.paths._sizes || {}
      const items = sizes.map(k => ({ key: k, label: sizeMeta[k] ? `${k.toUpperCase()} (${sizeMeta[k]}px)` : k.toUpperCase() }))
      items.push({ key: 'raw', label: 'RAW (original)' })
      return items
    },
    shareUrl() {
      return this.view.share_link
        ? `${window.location.origin}/views/${this.view.share_link}`
        : ''
    },
    uploadUrl() {
      return this.view.upload_link
        ? `${window.location.origin}/upload_view/${this.view.upload_link}`
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
