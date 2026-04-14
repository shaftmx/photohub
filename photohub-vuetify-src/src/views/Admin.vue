<template>
  <v-container class="pa-6" max-width="1100">

    <!-- Page header -->
    <div class="mb-6">
      <p class="text-h5 font-weight-medium mb-1">Admin</p>
      <p class="text-body-2 text-medium-emphasis">Manage users, tags and application settings.</p>
    </div>

    <!-- Tabs — each tab is conditionally shown based on the user's role -->
    <v-tabs v-model="tab" color="primary" class="mb-6" @update:modelValue="onTabChange">
      <v-tab v-if="role === 'admin'" value="users" class="text-none">Users</v-tab>
      <v-tab v-if="role === 'admin' || role === 'contributor'" value="tags" class="text-none">Tags</v-tab>
      <v-tab v-if="role === 'admin'" value="quality" class="text-none">Photo quality</v-tab>
      <v-tab v-if="role === 'admin'" value="backup" class="text-none">Backup / Export</v-tab>
    </v-tabs>

    <v-window v-model="tab">

      <!-- ─────────────── Tab: Users ─────────────── -->
      <v-window-item value="users">
        <v-row align="start">

          <!-- Create user form -->
          <v-col cols="12" md="4">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">New user</p>
            <v-text-field v-model="createUsername" label="Username" density="compact"
              variant="outlined" class="mb-3" autocomplete="off"></v-text-field>
            <v-select v-model="createRole" :items="['admin', 'contributor', 'member']"
              label="Role" density="compact" variant="outlined" class="mb-3"></v-select>
            <v-text-field v-model="createPassword" label="Password" type="password"
              density="compact" variant="outlined" autocomplete="new-password">
              <template v-slot:append-inner>
                <v-icon size="18" style="cursor:pointer" title="Generate password"
                  @click="generatePassword('create')">mdi-dice-multiple</v-icon>
              </template>
            </v-text-field>
            <!-- Show generated password so admin can copy it -->
            <div v-if="createPasswordGenerated" class="d-flex align-center mt-2 px-3 py-2 rounded"
              style="background: rgba(var(--v-theme-primary), 0.08); font-size:13px; font-family:monospace; gap:8px;">
              <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">{{ createPassword }}</span>
              <v-btn size="x-small" variant="text" icon @click="copyToClipboard(createPassword)" title="Copy">
                <v-icon size="14">mdi-content-copy</v-icon>
              </v-btn>
            </div>
            <v-btn color="primary" variant="flat" :loading="createLoading" class="mt-4"
              :disabled="!createUsername || !createPassword"
              @click="createUser">Create user</v-btn>
          </v-col>

          <!-- Users list -->
          <v-col cols="12" md="8">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Users</p>
            <v-table density="comfortable" class="users-table rounded">
              <thead>
                <tr>
                  <th class="text-left">Username</th>
                  <th class="text-left">Role</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u.id" class="user-row">
                  <td class="font-weight-medium">{{ u.username }}</td>
                  <td>
                    <v-chip :color="roleColor(u.role)" size="x-small" variant="tonal"
                      class="font-weight-medium">{{ u.role }}</v-chip>
                  </td>
                  <td class="text-right actions-cell">
                    <v-btn size="small" variant="text" density="compact"
                      @click="openResetPassword(u)" title="Reset password">
                      <v-icon size="16">mdi-lock-reset</v-icon>
                    </v-btn>
                    <v-btn size="small" variant="text" density="compact"
                      @click="openChangeRole(u)" title="Change role">
                      <v-icon size="16">mdi-account-edit</v-icon>
                    </v-btn>
                    <v-btn size="small" variant="text" density="compact" color="error"
                      @click="openDeleteUser(u)" :disabled="u.id === currentUserId" title="Delete user">
                      <v-icon size="16">mdi-delete-outline</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-col>
        </v-row>

        <!-- Role permissions reference -->
        <v-row class="mt-6">
          <v-col cols="12">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Role permissions</p>
            <v-table density="compact" class="rounded permissions-table">
              <thead>
                <tr>
                  <th class="text-left">Feature</th>
                  <th class="text-center">Admin</th>
                  <th class="text-center">Contributor</th>
                  <th class="text-center">Member</th>
                  <th class="text-center">Unauthenticated</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="perm in permissions" :key="perm.label">
                  <td class="text-body-2">{{ perm.label }}</td>
                  <td class="text-center"><v-icon size="16" :color="perm.admin ? 'success' : 'medium-emphasis'">{{ perm.admin ? 'mdi-check' : 'mdi-minus' }}</v-icon></td>
                  <td class="text-center"><v-icon size="16" :color="perm.contributor ? 'success' : 'medium-emphasis'">{{ perm.contributor ? 'mdi-check' : 'mdi-minus' }}</v-icon></td>
                  <td class="text-center"><v-icon size="16" :color="perm.member ? 'success' : 'medium-emphasis'">{{ perm.member ? 'mdi-check' : 'mdi-minus' }}</v-icon></td>
                  <td class="text-center"><v-icon size="16" :color="perm.anon ? 'success' : 'medium-emphasis'">{{ perm.anon ? 'mdi-check' : 'mdi-minus' }}</v-icon></td>
                </tr>
              </tbody>
            </v-table>
          </v-col>
        </v-row>

        <!-- Dialog: reset password -->
        <v-dialog v-model="resetPasswordDialog" max-width="380">
          <v-card>
            <v-card-title class="text-subtitle-1 pt-5 px-5">Reset password
              <span class="text-medium-emphasis font-weight-regular"> — {{ resetPasswordTarget?.username }}</span>
            </v-card-title>
            <v-card-text class="px-5">
              <v-text-field v-model="resetPasswordValue" label="New password" type="password"
                density="compact" variant="outlined" autofocus autocomplete="new-password">
                <template v-slot:append-inner>
                  <v-icon size="18" style="cursor:pointer" title="Generate password"
                    @click="generatePassword('reset')">mdi-dice-multiple</v-icon>
                </template>
              </v-text-field>
              <div v-if="resetPasswordGenerated" class="d-flex align-center mt-2 px-3 py-2 rounded"
                style="background: rgba(var(--v-theme-primary), 0.08); font-size:13px; font-family:monospace; gap:8px;">
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">{{ resetPasswordValue }}</span>
                <v-btn size="x-small" variant="text" icon @click="copyToClipboard(resetPasswordValue)" title="Copy">
                  <v-icon size="14">mdi-content-copy</v-icon>
                </v-btn>
              </div>
            </v-card-text>
            <v-card-actions class="px-5 pb-4">
              <v-spacer></v-spacer>
              <v-btn variant="text" class="text-none" @click="resetPasswordDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" class="text-none" :disabled="!resetPasswordValue"
                @click="confirmResetPassword">Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Dialog: change role -->
        <v-dialog v-model="changeRoleDialog" max-width="340">
          <v-card>
            <v-card-title class="text-subtitle-1 pt-5 px-5">Change role
              <span class="text-medium-emphasis font-weight-regular"> — {{ changeRoleTarget?.username }}</span>
            </v-card-title>
            <v-card-text class="px-5">
              <v-select v-model="changeRoleValue" :items="['admin', 'contributor', 'member']"
                label="Role" density="compact" variant="outlined"></v-select>
            </v-card-text>
            <v-card-actions class="px-5 pb-4">
              <v-spacer></v-spacer>
              <v-btn variant="text" class="text-none" @click="changeRoleDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" class="text-none" @click="confirmChangeRole">Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Dialog: confirm delete -->
        <v-dialog v-model="deleteDialog" max-width="420">
          <v-card>
            <v-card-title class="text-subtitle-1 pt-5 px-5">Delete user</v-card-title>
            <v-card-text class="px-5">
              Delete <strong>{{ deleteTarget?.username }}</strong>?
              Their photos and views will be reassigned to your account.
            </v-card-text>
            <v-card-actions class="px-5 pb-4">
              <v-spacer></v-spacer>
              <v-btn variant="text" class="text-none" @click="deleteDialog = false">Cancel</v-btn>
              <v-btn color="error" variant="flat" class="text-none" @click="confirmDeleteUser">Delete</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-window-item>

      <!-- ─────────────── Tab: Tags ─────────────── -->
      <v-window-item value="tags">
        <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Tag groups &amp; tags</p>
        <p class="text-body-2 text-medium-emphasis mb-2">
          Edit tag groups and tags in YAML format. Save to apply.
          Removing an entry <strong>deletes</strong> it from the database and removes it from all photos.
          To <strong>rename</strong> a tag safely, change its <code>name</code> while keeping its <code>id</code> — photo associations are preserved.
        </p>
        <v-expansion-panels variant="accordion" class="mb-4" density="compact">
          <v-expansion-panel>
            <v-expansion-panel-title class="text-body-2 text-medium-emphasis py-1">YAML syntax reference</v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="text-body-2 mb-3">
                <strong>Structure</strong>
                <pre class="syntax-block">tag_groups:
  - id: 1                    # set by the server — do not change (used for rename)
    name: "Country"          # required — group name
    type: checkbox            # see below
    color: "#FFCC00"          # optional — hex (#FFCC00) or CSS name (blue, red…)
    description: "..."        # optional
    tags:
      - id: 42               # set by the server — do not change
        name: "France"        # rename here while keeping the id → photo tags preserved
        color: "#0055A4"      # optional — overrides group color</pre>
              </div>
              <div class="text-body-2 mb-3">
                <strong>type</strong> — controls how the group is rendered in the tag editor and filters:
                <v-table density="compact" class="mt-2 syntax-table">
                  <thead>
                    <tr>
                      <th>Value</th>
                      <th>Tag editor (photo detail)</th>
                      <th>Filter panel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>checkbox</code></td>
                      <td>Chips — click to toggle each tag</td>
                      <td>Chips — click to toggle filter</td>
                    </tr>
                    <tr>
                      <td><code>combobox</code></td>
                      <td>Autocomplete input — type to search or add</td>
                      <td>Autocomplete input</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
              <div class="text-body-2">
                <strong>color</strong> — set at group level, overridable per tag. Accepts hex (<code>#0055A4</code>) or any CSS color name (<code>blue</code>, <code>red</code>…). Used as chip background color throughout the UI.
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
        <div class="yaml-editor-wrap" :class="{ loading: tagsLoading }">
          <div ref="yamlEditor"></div>
        </div>
        <div class="d-flex mt-4 mb-6">
          <v-btn color="primary" variant="flat" class="text-none" :loading="tagsSaving" @click="saveTags">Save tags</v-btn>
        </div>

        <!-- Preview -->
        <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Preview</p>
        <TagGroupsEditor :tag-groups="tagGroups" v-model="tagsPreviewSelection" />
      </v-window-item>

      <!-- ─────────────── Tab: Photo quality ─────────────── -->
      <v-window-item value="quality">
        <v-row>
          <v-col cols="12" md="5">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-4" style="letter-spacing:.08em">Raw photo processing</p>

            <v-select
              v-model="qualityConfig.RAW_PHOTOS_QUALITY"
              :items="[75, 85, 90, 95, 100]"
              label="JPEG quality"
              density="compact"
              variant="outlined"
              class="mb-3"
              hint="Quality used when converting RAW photos to JPEG (0-100)"
              persistent-hint
            ></v-select>

            <v-text-field
              v-model.number="qualityConfig.RAW_PHOTOS_MAX_SIZE"
              label="Max size (px)"
              type="number"
              density="compact"
              variant="outlined"
              class="mb-3"
              hint="Longest edge in pixels — 0 = no resize"
              persistent-hint
            ></v-text-field>

            <v-switch
              v-model="qualityConfig.RAW_PHOTO_OVERRIDE_EXISTS"
              :true-value="'True'"
              :false-value="'False'"
              label="Override existing files"
              color="primary"
              density="compact"
              class="mb-4"
              hide-details
            ></v-switch>

            <v-btn color="primary" variant="flat" class="text-none" :loading="qualitySaving" @click="saveConfig">Save settings</v-btn>
          </v-col>

          <v-col cols="12" md="7">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-2" style="letter-spacing:.08em">Sample photos settings</p>
            <p class="text-body-2 text-medium-emphasis mb-2">
              YAML list defining the sample sizes to generate for each photo.<br>
              Each entry: <code>name</code>, <code>max_size</code>, <code>quality</code> (optional).
            </p>
            <div class="yaml-editor-wrap" :class="{ loading: qualityLoading }">
              <div ref="sampleEditor"></div>
            </div>
            <div class="d-flex align-center mt-4 mb-6 gap-3">
              <v-btn color="primary" variant="flat" class="text-none" :loading="qualitySaving" @click="saveConfig">Save settings</v-btn>
              <v-btn variant="tonal" class="text-none ml-3" :loading="resampleLoading" @click="resampleAll">Resample all photos</v-btn>
            </div>
          </v-col>
        </v-row>

        <!-- Read-only storage info -->
        <v-divider class="mb-4"></v-divider>
        <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Storage</p>
        <div v-if="qualityConfig.disk_usage" class="d-flex flex-wrap gap-4 mb-2">
          <div>
            <span class="text-caption text-medium-emphasis">MEDIA_ROOT</span><br>
            <code class="text-body-2">{{ qualityConfig.MEDIA_ROOT }}</code>
          </div>
          <div>
            <span class="text-caption text-medium-emphasis">DUMP_ROOT</span><br>
            <code class="text-body-2">{{ qualityConfig.DUMP_ROOT }}</code>
          </div>
          <div>
            <span class="text-caption text-medium-emphasis">Total</span><br>
            <span class="text-body-2">{{ formatBytes(qualityConfig.disk_usage.total) }}</span>
          </div>
          <div>
            <span class="text-caption text-medium-emphasis">Used</span><br>
            <span class="text-body-2">{{ formatBytes(qualityConfig.disk_usage.used) }}</span>
          </div>
          <div>
            <span class="text-caption text-medium-emphasis">Free</span><br>
            <span class="text-body-2">{{ formatBytes(qualityConfig.disk_usage.free) }}</span>
          </div>
        </div>
      </v-window-item>

      <!-- ─────────────── Tab: Backup / Export (placeholder) ─────────────── -->
      <v-window-item value="backup">
        <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Backup / Export</p>
        <p class="text-body-2 text-medium-emphasis">Coming soon.</p>
      </v-window-item>

    </v-window>
  </v-container>
</template>

<script>
import { requireAdminOrContributor } from '../authrequired.js'
import TagGroupsEditor from '../components/TagGroupsEditor.vue'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { useAlertStore } from '../stores/alert'
import { EditorView, basicSetup } from 'codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { indentWithTab } from '@codemirror/commands'
import { keymap } from '@codemirror/view'

export default {
  components: { TagGroupsEditor },
  data: () => ({
    tab: null,
    role: '',
    currentUserId: null,

    // Users tab
    users: [],
    createUsername: '',
    createPassword: '',
    createPasswordGenerated: false,
    createRole: 'member',
    createLoading: false,
    resetPasswordDialog: false,
    resetPasswordTarget: null,
    resetPasswordValue: '',
    resetPasswordGenerated: false,
    changeRoleDialog: false,
    changeRoleTarget: null,
    changeRoleValue: '',
    deleteDialog: false,
    deleteTarget: null,

    // Role permissions reference table
    permissions: [
      { label: 'View public views',                   admin: true,  contributor: true,  member: true,  anon: true  },
      { label: 'View private views',                  admin: true,  contributor: true,  member: true,  anon: false },
      { label: 'Access via share link (private view)',admin: true,  contributor: true,  member: true,  anon: true  },
      { label: 'Photo detail + EXIF',                 admin: true,  contributor: true,  member: true,  anon: false },
      { label: 'Toggle favorites',                    admin: true,  contributor: true,  member: false, anon: false },
      { label: 'Upload photos',                       admin: true,  contributor: true,  member: false, anon: false },
      { label: 'Edit / delete photos',                admin: true,  contributor: true,  member: false, anon: false },
      { label: 'Tag photos',                          admin: true,  contributor: true,  member: false, anon: false },
      { label: 'Unpublished — publish / delete',      admin: true,  contributor: true,  member: false, anon: false },
      { label: 'Create / edit / delete views',        admin: true,  contributor: true,  member: false, anon: false },
      { label: 'Admin panel — Tags',                  admin: true,  contributor: true,  member: false, anon: false },
      { label: 'Admin panel — Users',                 admin: true,  contributor: false, member: false, anon: false },
      { label: 'Admin panel — Photo quality',         admin: true,  contributor: false, member: false, anon: false },
      { label: 'Admin panel — Backup / Export',       admin: true,  contributor: false, member: false, anon: false },
    ],

    // Tags tab
    tagsYaml: '',
    tagsLoading: false,
    tagsSaving: false,
    tagGroups: [],
    tagsPreviewSelection: {},

    // Photo quality tab
    qualityConfig: {},
    qualitySampleYaml: '',
    qualityLoading: false,
    qualitySaving: false,
    resampleLoading: false,
  }),

  async mounted() {
    const result = await requireAdminOrContributor(this)
    if (!result) return  // redirected — stop here

    this.role = result.role
    this.currentUserId = result.id
    this.tab = this.role === 'contributor' ? 'tags' : 'users'

    if (this.role === 'admin') await this.loadUsers()
    await this.loadTags()
  },

  beforeUnmount() {
    if (this._cmEditor) {
      this._cmEditor.destroy()
      this._cmEditor = null
    }
    if (this._cmSampleEditor) {
      this._cmSampleEditor.destroy()
      this._cmSampleEditor = null
    }
  },

  methods: {
    // ── Password utilities ────────────────────────────────────────────────
    generatePassword(target) {
      // Generates a random 16-char password: letters + digits + safe symbols
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#%^&*'
      const password = Array.from({ length: 16 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('')
      if (target === 'create') {
        this.createPassword = password
        this.createPasswordGenerated = true
      } else {
        this.resetPasswordValue = password
        this.resetPasswordGenerated = true
      }
    },

    copyToClipboard(text) {
      navigator.clipboard.writeText(text)
    },

    // ── Role helpers ──────────────────────────────────────────────────────
    roleColor(role) {
      const colors = { admin: 'error', contributor: 'warning', member: 'info', unknown: 'default' }
      return colors[role] || 'default'
    },

    // ── Users ─────────────────────────────────────────────────────────────
    async loadUsers() {
      const { data } = await useAsyncFetch('/api/admin/users')
      if (data.value && !data.value.ERROR) {
        this.users = data.value.data || []
      }
    },

    async createUser() {
      const { triggerAlert } = useAlertStore()
      this.createLoading = true
      const { data } = await useAsyncPost('/api/admin/users/create', {
        username: this.createUsername,
        password: this.createPassword,
        role: this.createRole,
      })
      this.createLoading = false
      if (data.value && !data.value.ERROR) {
        triggerAlert('success', 'User created', this.createUsername)
        this.createUsername = ''
        this.createPassword = ''
        this.createPasswordGenerated = false
        this.createRole = 'member'
        await this.loadUsers()
      } else {
        triggerAlert('error', 'Create failed', data.value?.details || '')
      }
    },

    openResetPassword(user) {
      this.resetPasswordTarget = user
      this.resetPasswordValue = ''
      this.resetPasswordGenerated = false
      this.resetPasswordDialog = true
    },
    async confirmResetPassword() {
      const { triggerAlert } = useAlertStore()
      const { data } = await useAsyncPost(`/api/admin/users/${this.resetPasswordTarget.id}/set-password`, {
        password: this.resetPasswordValue,
      })
      this.resetPasswordDialog = false
      if (data.value && !data.value.ERROR) {
        triggerAlert('success', 'Password updated', '')
      } else {
        triggerAlert('error', 'Update failed', data.value?.details || '')
      }
    },

    openChangeRole(user) {
      this.changeRoleTarget = user
      this.changeRoleValue = user.role
      this.changeRoleDialog = true
    },
    async confirmChangeRole() {
      const { triggerAlert } = useAlertStore()
      const { data } = await useAsyncPost(`/api/admin/users/${this.changeRoleTarget.id}/set-role`, {
        role: this.changeRoleValue,
      })
      this.changeRoleDialog = false
      if (data.value && !data.value.ERROR) {
        triggerAlert('success', 'Role updated', '')
        await this.loadUsers()
      } else {
        triggerAlert('error', 'Update failed', data.value?.details || '')
      }
    },

    openDeleteUser(user) {
      this.deleteTarget = user
      this.deleteDialog = true
    },
    async confirmDeleteUser() {
      const { triggerAlert } = useAlertStore()
      const { data } = await useAsyncPost(`/api/admin/users/${this.deleteTarget.id}/delete`, {})
      this.deleteDialog = false
      if (data.value && !data.value.ERROR) {
        triggerAlert('success', 'User deleted', this.deleteTarget.username)
        await this.loadUsers()
      } else {
        triggerAlert('error', 'Delete failed', data.value?.details || '')
      }
    },

    // ── Tags ──────────────────────────────────────────────────────────────
    async onTabChange(tab) {
      if (tab === 'tags') {
        await this.$nextTick()
        this._initEditor(this.tagsYaml)
      }
      if (tab === 'quality') {
        await this.loadConfig()
      }
    },

    _initEditor(content) {
      if (this._cmEditor) {
        this._cmEditor.destroy()
        this._cmEditor = null
      }
      if (!this.$refs.yamlEditor) return
      this._cmEditor = new EditorView({
        doc: content,
        extensions: [
          basicSetup,
          yaml(),
          oneDark,
          keymap.of([indentWithTab]),
          // Sync editor content back to tagsYaml on every change
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              this.tagsYaml = update.state.doc.toString()
            }
          }),
        ],
        parent: this.$refs.yamlEditor,
      })
    },

    async loadTags() {
      this.tagsLoading = true
      const [yamlRes, tagsRes] = await Promise.all([
        useAsyncFetch('/api/admin/tags'),
        useAsyncFetch('/api/tags'),
      ])
      if (yamlRes.data.value && !yamlRes.data.value.ERROR) {
        this.tagsYaml = yamlRes.data.value.data?.yaml || ''
      }
      if (tagsRes.data.value && !tagsRes.data.value.ERROR) {
        this.tagGroups = tagsRes.data.value.data?.tag_groups || []
      }
      this.tagsLoading = false
      // Init editor only if the Tags tab is currently visible
      if (this.tab === 'tags') {
        await this.$nextTick()
        this._initEditor(this.tagsYaml)
      }
    },

    // ── Photo quality ─────────────────────────────────────────────────────
    async loadConfig() {
      this.qualityLoading = true
      const { data } = await useAsyncFetch('/api/admin/config')
      if (data.value && !data.value.ERROR) {
        this.qualityConfig = data.value.data || {}
        this.qualitySampleYaml = this.qualityConfig.SAMPLE_PHOTOS_SETTINGS || ''
      }
      this.qualityLoading = false
      await this.$nextTick()
      this._initSampleEditor(this.qualitySampleYaml)
    },

    _initSampleEditor(content) {
      if (this._cmSampleEditor) {
        this._cmSampleEditor.destroy()
        this._cmSampleEditor = null
      }
      if (!this.$refs.sampleEditor) return
      this._cmSampleEditor = new EditorView({
        doc: content,
        extensions: [
          basicSetup,
          yaml(),
          oneDark,
          keymap.of([indentWithTab]),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              this.qualitySampleYaml = update.state.doc.toString()
            }
          }),
        ],
        parent: this.$refs.sampleEditor,
      })
    },

    async saveConfig() {
      const { triggerAlert } = useAlertStore()
      this.qualitySaving = true
      const payload = {
        RAW_PHOTOS_QUALITY:      this.qualityConfig.RAW_PHOTOS_QUALITY,
        RAW_PHOTOS_MAX_SIZE:     this.qualityConfig.RAW_PHOTOS_MAX_SIZE,
        RAW_PHOTO_OVERRIDE_EXISTS: this.qualityConfig.RAW_PHOTO_OVERRIDE_EXISTS,
        SAMPLE_PHOTOS_SETTINGS:  this.qualitySampleYaml,
      }
      const { data } = await useAsyncPost('/api/admin/config', payload)
      this.qualitySaving = false
      if (data.value && !data.value.ERROR) {
        triggerAlert('success', 'Settings saved', '')
      } else {
        triggerAlert('error', 'Save failed', data.value?.details || '')
      }
    },

    async resampleAll() {
      const { triggerAlert } = useAlertStore()
      this.resampleLoading = true
      const { data } = await useAsyncPost('/api/admin/resample', {})
      this.resampleLoading = false
      if (data.value && !data.value.ERROR) {
        triggerAlert('success', 'Resample started', 'Processing in background')
      } else {
        triggerAlert('error', 'Resample failed', data.value?.details || '')
      }
    },

    formatBytes(bytes) {
      if (!bytes) return '–'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let i = 0
      while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
      return bytes.toFixed(1) + ' ' + units[i]
    },

    async saveTags() {
      const { triggerAlert } = useAlertStore()
      this.tagsSaving = true
      const { data } = await useAsyncPost('/api/admin/tags', { yaml: this.tagsYaml })
      this.tagsSaving = false
      if (data.value && !data.value.ERROR) {
        triggerAlert('success', 'Tags saved', '')
        await this.loadTags()
      } else {
        triggerAlert('error', 'Save failed', data.value?.details || '')
      }
    },
  },
}
</script>

<style scoped>
.font-monospace {
  font-family: monospace;
}

.syntax-block {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 12px;
  font-family: monospace;
  margin-top: 6px;
  white-space: pre;
  overflow-x: auto;
}

.syntax-table {
  font-size: 12px;
}
.syntax-table code {
  font-size: 11px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 1px 4px;
  border-radius: 3px;
}

.yaml-editor-wrap {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  overflow: hidden;
}
.yaml-editor-wrap.loading {
  opacity: 0.5;
  pointer-events: none;
}
/* Make the editor fill the container and set a comfortable height */
.yaml-editor-wrap :deep(.cm-editor) {
  height: 520px;
  font-size: 13px;
}
.yaml-editor-wrap :deep(.cm-scroller) {
  overflow: auto;
}

/* Permissions table — alternate row shading */
.permissions-table tbody tr:nth-child(odd) {
  background: rgba(var(--v-theme-on-surface), 0.02);
}

/* Show action buttons only on row hover */
.user-row .actions-cell .v-btn {
  opacity: 0;
  transition: opacity 0.15s;
}
.user-row:hover .actions-cell .v-btn {
  opacity: 1;
}
/* Always show the delete button if it's disabled (greyed out = own account) */
.user-row .actions-cell .v-btn:disabled {
  opacity: 0.3;
}
</style>
