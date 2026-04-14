<template>
  <v-container class="pa-6" max-width="1100">

    <!-- Page header -->
    <div class="mb-6">
      <p class="text-h5 font-weight-medium mb-1">Admin</p>
      <p class="text-body-2 text-medium-emphasis">Manage users, tags and application settings.</p>
    </div>

    <!-- Tabs — each tab is conditionally shown based on the user's role -->
    <v-tabs v-model="tab" color="primary" class="mb-6">
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
        <p class="text-body-2 text-medium-emphasis mb-4">
          Edit tag groups and tags in YAML format. Save to apply.
          Removing an entry here does <strong>not</strong> delete it from the database — existing photo associations are preserved.
        </p>
        <v-textarea v-model="tagsYaml" :loading="tagsLoading" rows="22"
          variant="outlined" class="font-monospace" hide-details></v-textarea>
        <div class="d-flex mt-4">
          <v-btn color="primary" variant="flat" class="text-none" :loading="tagsSaving" @click="saveTags">Save tags</v-btn>
        </div>
      </v-window-item>

      <!-- ─────────────── Tab: Photo quality (placeholder) ─────────────── -->
      <v-window-item value="quality">
        <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Photo quality</p>
        <p class="text-body-2 text-medium-emphasis">Coming soon.</p>
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
import { useAsyncFetch } from '../reactivefetch.js'
import { useAsyncPost } from '../reactivefetch.js'
import { useAlertStore } from '../stores/alert'

export default {
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
  }),

  async mounted() {
    const result = await requireAdminOrContributor(this)
    if (!result) return  // redirected — stop here

    this.role = result.role
    this.currentUserId = result.id
    // Set the initial visible tab based on role
    this.tab = this.role === 'contributor' ? 'tags' : 'users'

    if (this.role === 'admin') await this.loadUsers()
    await this.loadTags()
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
    async loadTags() {
      this.tagsLoading = true
      const { data } = await useAsyncFetch('/api/admin/tags')
      if (data.value && !data.value.ERROR) {
        this.tagsYaml = data.value.data?.yaml || ''
      }
      this.tagsLoading = false
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
