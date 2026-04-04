<template>
  <v-navigation-drawer
    v-model="displayed"
    location="right"
    temporary
    :width="sharedDatas && sharedDatas.isMobile ? '100%' : 480"
    class="photo-detail-drawer"
  >
    <!-- Header -->
    <v-toolbar color="primary" density="compact">
      <v-btn icon @click="close()">
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <v-toolbar-title class="text-body-1 font-weight-medium">Photo details</v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- Action buttons -->
      <v-btn
        v-if="photo && photo.published"
        icon
        variant="text"
        color="white"
        :loading="loadingUnpublish"
        @click="confirmAction('unpublish')"
        title="Repasser en non publié"
      >
        <v-icon>mdi-cloud-off-outline</v-icon>
      </v-btn>
      <v-btn
        icon
        variant="text"
        color="error"
        :loading="loadingDelete"
        @click="confirmAction('delete')"
        title="Supprimer définitivement"
      >
        <v-icon>mdi-delete-outline</v-icon>
      </v-btn>
    </v-toolbar>

    <!-- Loading state -->
    <div v-if="loading" class="d-flex justify-center align-center pa-12">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <div v-if="!loading && photo" class="pa-4">

      <!-- Thumbnail -->
      <v-card rounded="lg" elevation="2" class="mb-4 overflow-hidden">
        <v-img
          :src="photoThumbUrl"
          :aspect-ratio="photo.width / photo.height"
          cover
          max-height="260"
        >
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
          </template>
        </v-img>
      </v-card>

      <!-- Status chip -->
      <div class="mb-4 d-flex align-center gap-2">
        <v-chip
          :color="photo.published ? 'success' : 'warning'"
          size="small"
          variant="tonal"
          :prepend-icon="photo.published ? 'mdi-cloud-check' : 'mdi-folder-upload'"
        >
          {{ photo.published ? 'Publié' : 'Non publié' }}
        </v-chip>
        <v-chip size="small" variant="outlined" class="ml-1">
          {{ photo.width }}×{{ photo.height }}
        </v-chip>
      </div>

      <!-- Description (editable) -->
      <v-textarea
        v-model="editDescription"
        label="Description"
        density="compact"
        variant="outlined"
        rows="2"
        auto-grow
        class="mb-2"
        hide-details
        @blur="saveDescription()"
      ></v-textarea>
      <p class="text-caption text-medium-emphasis mb-4">La description est sauvegardée automatiquement</p>

      <!-- Tags section -->
      <v-divider class="mb-3"></v-divider>
      <div class="d-flex align-center mb-3">
        <v-icon size="small" class="mr-2" color="primary">mdi-tag-multiple</v-icon>
        <span class="text-body-2 font-weight-medium">Tags</span>
        <v-spacer></v-spacer>
        <v-btn
          size="x-small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-pencil"
          @click="$emit('editTags', photo.filename)"
        >Modifier</v-btn>
      </div>

      <div v-if="Object.keys(photo.tags).length === 0" class="text-caption text-medium-emphasis mb-4 ml-1">
        Aucun tag — cliquez sur Modifier pour en ajouter
      </div>

      <div class="d-flex flex-wrap ga-1 mb-4">
        <template v-for="(tagList, groupName) in photo.tags" :key="groupName">
          <v-chip
            v-for="tagName in tagList"
            :key="tagName"
            size="small"
            variant="tonal"
            :prepend-icon="'mdi-square-rounded'"
          >{{ tagName }}</v-chip>
        </template>
      </div>

      <!-- Metadata section -->
      <v-divider class="mb-3"></v-divider>
      <div class="d-flex align-center mb-3">
        <v-icon size="small" class="mr-2" color="primary">mdi-information-outline</v-icon>
        <span class="text-body-2 font-weight-medium">Métadonnées</span>
      </div>

      <v-list density="compact" class="pa-0 mb-4 rounded-lg" style="background: rgba(0,0,0,0.04);">
        <v-list-item v-if="photo.origin_filename" class="px-3 py-1">
          <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-file-image</v-icon></template>
          <v-list-item-title class="text-caption text-medium-emphasis">Fichier original</v-list-item-title>
          <v-list-item-subtitle class="text-caption text-truncate">{{ photo.origin_filename }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider v-if="photo.origin_filename"></v-divider>
        <v-list-item class="px-3 py-1">
          <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-calendar</v-icon></template>
          <v-list-item-title class="text-caption text-medium-emphasis">Date photo</v-list-item-title>
          <v-list-item-subtitle class="text-caption">{{ formatDate(photo.date) }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item class="px-3 py-1">
          <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-upload</v-icon></template>
          <v-list-item-title class="text-caption text-medium-emphasis">Uploadé le</v-list-item-title>
          <v-list-item-subtitle class="text-caption">{{ formatDate(photo.upload_date) }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item class="px-3 py-1">
          <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-account</v-icon></template>
          <v-list-item-title class="text-caption text-medium-emphasis">Propriétaire</v-list-item-title>
          <v-list-item-subtitle class="text-caption">{{ photo.owner }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item class="px-3 py-1">
          <template v-slot:prepend><v-icon size="x-small" class="mr-2 text-medium-emphasis">mdi-fingerprint</v-icon></template>
          <v-list-item-title class="text-caption text-medium-emphasis">Nom de fichier (md5)</v-list-item-title>
          <v-list-item-subtitle class="text-caption text-truncate" style="font-family: monospace; font-size: 10px;">{{ photo.filename }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <!-- EXIF section -->
      <v-divider class="mb-3"></v-divider>
      <div
        class="d-flex align-center mb-2 cursor-pointer"
        @click="showExif = !showExif"
        style="cursor: pointer;"
      >
        <v-icon size="small" class="mr-2" color="primary">mdi-camera-iris</v-icon>
        <span class="text-body-2 font-weight-medium">EXIF</span>
        <v-spacer></v-spacer>
        <v-icon size="small">{{ showExif ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </div>

      <v-expand-transition>
        <div v-show="showExif">
          <div v-if="!photo.exif || Object.keys(photo.exif).length === 0" class="text-caption text-medium-emphasis ml-1 mb-4">
            Aucune donnée EXIF disponible
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

    <!-- Confirm dialog -->
    <v-dialog v-model="confirmDialog" max-width="400" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-h6 pt-5 px-5">
          {{ confirmDialogAction === 'delete' ? 'Supprimer la photo ?' : 'Repasser en non publié ?' }}
        </v-card-title>
        <v-card-text class="px-5 text-body-2">
          <span v-if="confirmDialogAction === 'delete'">
            Cette action est <strong>irréversible</strong>. La photo sera supprimée du disque et de la base de données.
          </span>
          <span v-else>
            La photo sera retirée de la galerie publique et repassera en "non publiée".
          </span>
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="confirmDialog = false">Annuler</v-btn>
          <v-btn
            :color="confirmDialogAction === 'delete' ? 'error' : 'warning'"
            variant="flat"
            @click="executeAction()"
            :loading="loadingDelete || loadingUnpublish"
          >
            {{ confirmDialogAction === 'delete' ? 'Supprimer' : 'Dépublier' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-navigation-drawer>
</template>


<script>
import { defineComponent } from 'vue'
import { getSharedDatas } from '../sharedDatas.js'
import { useAlertStore } from '../stores/alert'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'

export default defineComponent({
  emits: ['closed', 'deleted', 'unpublished', 'editTags'],

  data: () => ({
    displayed: false,
    loading: false,
    loadingDelete: false,
    loadingUnpublish: false,
    photo: null,
    paths: {},
    editDescription: '',
    showExif: false,
    confirmDialog: false,
    confirmDialogAction: null, // 'delete' | 'unpublish'
    sharedDatas: {},
  }),

  computed: {
    photoThumbUrl() {
      if (!this.photo || !this.paths) return ''
      const size = this.sharedDatas.isMobile ? 'xs' : 's'
      const basePath = this.paths[size] || Object.values(this.paths)[0] || ''
      return `${basePath}/${this.photo.hash_path}/${this.photo.filename}`
    },
  },

  mounted() {
    this.sharedDatas = getSharedDatas(this)
  },

  methods: {
    async open(filename) {
      this.displayed = true
      this.photo = null
      this.showExif = false
      this.loading = true

      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncFetch(`/api/photos/${filename}`)
      if (error.value) {
        triggerAlert('error', 'Erreur de chargement', error.value)
      } else if (data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.photo = data.value.data.photo
        this.paths = data.value.data.paths
        this.editDescription = this.photo.description || ''
      }
      this.loading = false
    },

    close() {
      this.displayed = false
      this.$emit('closed')
    },

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
      // CamelCase → "Camel Case"
      return key.replace(/([A-Z])/g, ' $1').replace(/^GPS /, 'GPS ').trim()
    },

    async saveDescription() {
      if (!this.photo) return
      if (this.editDescription === this.photo.description) return

      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/update`, {
        description: this.editDescription
      })
      if (error.value) {
        triggerAlert('error', 'Erreur de sauvegarde', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        this.photo.description = this.editDescription
        triggerAlert('success', 'Description sauvegardée', '')
      }
    },

    confirmAction(action) {
      this.confirmDialogAction = action
      this.confirmDialog = true
    },

    async executeAction() {
      if (this.confirmDialogAction === 'delete') {
        await this.doDelete()
      } else {
        await this.doUnpublish()
      }
      this.confirmDialog = false
    },

    async doDelete() {
      this.loadingDelete = true
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/delete`, {})
      if (error.value) {
        triggerAlert('error', 'Erreur de suppression', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        triggerAlert('success', 'Photo supprimée', '')
        this.$emit('deleted', this.photo.filename)
        this.close()
      }
      this.loadingDelete = false
    },

    async doUnpublish() {
      this.loadingUnpublish = true
      const { triggerAlert } = useAlertStore()
      const { data, error } = await useAsyncPost(`/api/photos/${this.photo.filename}/unpublish`, {})
      if (error.value) {
        triggerAlert('error', 'Erreur', error.value)
      } else if (data.value && data.value.ERROR) {
        triggerAlert('error', data.value.message, data.value.details)
      } else {
        triggerAlert('success', 'Photo dépubliée', '')
        this.$emit('unpublished', this.photo.filename)
        this.close()
      }
      this.loadingUnpublish = false
    },
  },
})
</script>

<style scoped>
.photo-detail-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}
</style>
