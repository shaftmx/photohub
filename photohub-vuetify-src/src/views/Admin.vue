<template>
  <v-container class="pa-6" max-width="1100">

    <!-- Page header -->
    <div class="mb-4">
      <p class="text-h5 font-weight-medium mb-1">Admin</p>
      <p class="text-body-2 text-medium-emphasis">Manage users, tags and application settings.</p>
    </div>

    <!-- Disk usage bar -->
    <div v-if="qualityConfig.disk_usage" class="mb-5 d-flex align-center ga-3" style="max-width: 400px">
      <span class="text-caption text-medium-emphasis text-no-wrap">Disk</span>
      <v-progress-linear
        :model-value="qualityConfig.disk_usage.used / qualityConfig.disk_usage.total * 100"
        :color="diskUsageColor"
        bg-color="surface-variant"
        rounded
        height="4"
      ></v-progress-linear>
      <span class="text-caption text-medium-emphasis text-no-wrap">{{ formatBytes(qualityConfig.disk_usage.free) }} free</span>
    </div>

    <!-- Tabs — each tab is conditionally shown based on the user's role -->
    <v-tabs v-model="tab" color="primary" class="mb-6" @update:modelValue="onTabChange">
      <v-tab v-if="role === 'admin'" value="users" class="text-none">Users</v-tab>
      <v-tab v-if="role === 'admin' || role === 'contributor'" value="tags" class="text-none">Tags</v-tab>
      <v-tab v-if="role === 'admin'" value="quality" class="text-none">Photo quality</v-tab>
      <v-tab v-if="role === 'admin'" value="video" class="text-none">Video</v-tab>
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
        <!-- Sample banner — shown only when no tags exist yet -->
        <v-alert v-if="tagsEmpty && !tagsLoading" type="info" variant="tonal" density="compact" class="mb-3">
          No tags yet.
          <template v-slot:append>
            <v-btn size="small" variant="tonal" class="text-none ml-2" :loading="sampleLoading" @click="loadSample">
              Load sample
            </v-btn>
          </template>
        </v-alert>

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
        <div class="d-flex justify-end mb-3">
          <v-btn color="primary" variant="flat" class="text-none" :loading="qualitySaving" @click="saveConfig">Save settings</v-btn>
        </div>
        <v-row>
          <v-col cols="12" md="5">
            <!-- Gallery page size -->
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Gallery page size</p>
            <v-text-field
              v-model="qualityConfig.GALLERY_PAGE_SIZE_DESKTOP"
              label="Desktop"
              type="number"
              density="compact"
              class="mb-2"
              hint="GALLERY_PAGE_SIZE_DESKTOP — max photos loaded per page on desktop (default: 600)"
              persistent-hint
            ></v-text-field>
            <v-text-field
              v-model="qualityConfig.GALLERY_PAGE_SIZE_MOBILE"
              label="Mobile"
              type="number"
              density="compact"
              class="mb-4"
              hint="GALLERY_PAGE_SIZE_MOBILE — max photos loaded per page on mobile (default: 500)"
              persistent-hint
            ></v-text-field>

            <v-divider class="mb-4"></v-divider>
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-4" style="letter-spacing:.08em">Raw photo processing</p>

            <v-select
              v-model="qualityConfig.RAW_PHOTOS_QUALITY"
              :items="qualityPresets"
              item-title="label"
              item-value="value"
              label="JPEG quality preset"
              density="compact"
              variant="outlined"
              class="mb-3"
              hint="RAW_PHOTOS_QUALITY — integer 1–95, or named preset: web_low, web_medium, web_high, web_very_high, web_maximum. Empty = original file stored as-is."
              persistent-hint
            ></v-select>

            <v-text-field
              v-model="qualityConfig.RAW_PHOTOS_MAX_SIZE"
              label="Max size (px)"
              type="number"
              density="compact"
              variant="outlined"
              class="mb-3"
              hint="RAW_PHOTOS_MAX_SIZE — Longest edge in pixels. Leave empty = no resize."
              persistent-hint
              clearable
            ></v-text-field>

            <v-switch
              v-model="qualityConfig.RAW_PHOTO_OVERRIDE_EXISTS"
              :true-value="true"
              :false-value="false"
              label="Override existing files"
              color="primary"
              density="compact"
              class="mb-2 ml-2"
              hint="RAW_PHOTO_OVERRIDE_EXISTS — re-process and overwrite file on disk when the same photo (or video) is re-uploaded. Also resets the original_ext field for videos."
              persistent-hint
            ></v-switch>

            <v-switch
              v-model="qualityConfig.GENERATE_SAMPLES_ON_UPLOAD"
              :true-value="true"
              :false-value="false"
              label="Generate samples on upload"
              color="primary"
              density="compact"
              class="mb-2 ml-2"
              hint="GENERATE_SAMPLES_ON_UPLOAD — disable to skip sample generation at upload time; samples are generated lazily on first access. Useful for bulk imports."
              persistent-hint
            ></v-switch>

            <!-- Raw storage doc -->
            <v-alert type="info" variant="tonal" density="compact" class="mt-4 mb-2 text-caption">
              By default, uploaded files are stored as-is in <code>raw/</code> — originals are preserved.
              <br>
              Set <strong>JPEG quality preset</strong> and/or <strong>Max size</strong> to re-encode files on upload:
              both settings work together — the file is resized first (if a max size is set), then re-encoded at the chosen quality.
              Leave both empty to keep originals intact.
            </v-alert>

          </v-col>

          <v-col cols="12" md="7">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-2" style="letter-spacing:.08em">Sample photos settings</p>
            <p class="text-body-2 text-medium-emphasis mb-3">
              YAML list defining the sample sizes to generate for each photo. You can define as many samples as needed (e.g. thumbnail, preview, fullscreen).
            </p>
            <v-alert type="warning" density="compact" variant="tonal" class="mb-3 text-caption">
              The following names are used by the UI and <strong>must be present</strong>: <code>xs</code>, <code>s</code>, <code>m</code>, <code>l</code>. Removing any of them will cause broken images.
            </v-alert>
            <v-expansion-panels variant="accordion" class="mb-3">
              <v-expansion-panel>
                <v-expansion-panel-title class="text-caption text-medium-emphasis py-2" style="min-height:36px">
                  How sizing and quality work
                </v-expansion-panel-title>
                <v-expansion-panel-text class="text-caption text-medium-emphasis">
                  <p class="mb-2">Each entry requires:</p>
                  <ul class="mb-3 pl-4" style="line-height:1.8">
                    <li><strong>name</strong> — unique identifier used in URLs (e.g. <code>thumb</code>, <code>large</code>)</li>
                    <li><strong>max_size</strong> — largest dimension in pixels. The image is resized so that neither width nor height exceeds this value, preserving aspect ratio.</li>
                    <li><strong>quality</strong> — JPEG quality: an integer <code>1–95</code>, a Pillow named preset, or <code>keep</code> to preserve the original quality. Omitting it defaults to <code>keep</code>.
                      <table style="margin-top:6px; border-collapse:collapse; font-size:0.9em">
                        <tr><th style="text-align:left; padding-right:16px">Preset</th><th style="text-align:left">~equivalent</th></tr>
                        <tr><td><code>web_low</code></td><td>10</td></tr>
                        <tr><td><code>web_medium</code></td><td>50</td></tr>
                        <tr><td><code>web_high</code></td><td>80</td></tr>
                        <tr><td><code>web_very_high</code></td><td>90</td></tr>
                        <tr><td><code>web_maximum</code></td><td>95</td></tr>
                      </table>
                    </li>
                  </ul>
                  <p class="mb-1">Example:</p>
                  <pre style="background:rgba(0,0,0,0.06); border-radius:4px; padding:8px; font-size:0.8em">- name: thumb
  max_size: 400
  quality: 80
- name: large
  max_size: 1920
  quality: keep</pre>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
            <div class="yaml-editor-wrap" :class="{ loading: qualityLoading }">
              <div ref="sampleEditor"></div>
            </div>
            <p class="text-caption text-disabled mt-1">SAMPLE_PHOTOS_SETTINGS</p>
            <div class="d-flex align-center mt-4 mb-6 gap-3">
              <v-btn variant="tonal" class="text-none" :loading="resampleLoading" @click="flushSamples">Flush samples</v-btn>
            </div>
          </v-col>
        </v-row>

        <!-- Read-only storage info -->
        <v-divider class="mb-4 mt-2"></v-divider>
        <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Storage</p>
        <v-table density="compact" class="rounded storage-table" style="max-width:520px">
          <tbody>
            <tr>
              <td class="text-caption text-medium-emphasis" style="width:120px">MEDIA_ROOT</td>
              <td><code class="text-body-2">{{ qualityConfig.MEDIA_ROOT || '–' }}</code></td>
            </tr>
            <tr>
              <td class="text-caption text-medium-emphasis">DUMP_ROOT</td>
              <td><code class="text-body-2">{{ qualityConfig.DUMP_ROOT || '–' }}</code></td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>

      <!-- ─────────────── Tab: Video ─────────────── -->
      <v-window-item value="video">
        <v-row>
          <!-- Left col: settings -->
          <v-col cols="12" md="5">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-4" style="letter-spacing:.08em">Upload</p>

            <v-switch
              v-model="qualityConfig.ALLOW_VIDEO_UPLOAD"
              :true-value="true"
              :false-value="false"
              label="Allow video upload"
              color="primary"
              density="compact"
              class="mb-2 ml-2"
              hint="ALLOW_VIDEO_UPLOAD — enable MP4/MOV/WebM video upload. Requires ffmpeg in the container."
              persistent-hint
            ></v-switch>

            <v-switch
              v-model="qualityConfig.KEEP_ORIGINAL_VIDEO"
              :true-value="true"
              :false-value="false"
              label="Keep original video file"
              color="primary"
              density="compact"
              class="mb-2 ml-2"
              hint="KEEP_ORIGINAL_VIDEO — keep the original uploaded file alongside the transcoded MP4. Uses extra disk space."
              persistent-hint
            ></v-switch>
            <v-alert v-if="qualityConfig.KEEP_ORIGINAL_VIDEO" type="warning" density="compact" variant="tonal" class="mb-2 text-caption">
              Enabling this stores the original file for each new upload. Already-uploaded videos are not affected retroactively.
            </v-alert>

            <v-divider class="my-4"></v-divider>
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-4" style="letter-spacing:.08em">Transcoding worker</p>

            <v-text-field
              v-model="qualityConfig.TRANSCODE_POLL_INTERVAL"
              type="number" label="Poll interval (seconds)"
              density="compact" variant="outlined" class="mb-3"
              hint="How often the worker checks for pending videos. Default: 10"
              persistent-hint clearable
            ></v-text-field>

            <v-text-field
              v-model="qualityConfig.TRANSCODE_THREADS"
              type="number" label="ffmpeg threads (0 = auto)"
              density="compact" variant="outlined" class="mb-3"
              hint="Number of CPU threads for encoding. 0 lets ffmpeg decide. Default: 0"
              persistent-hint clearable
            ></v-text-field>

            <v-select
              v-model="qualityConfig.TRANSCODE_PRESET"
              :items="['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower','veryslow']"
              label="Encoding preset"
              density="compact" variant="outlined" class="mb-3"
              hint="Slower preset = better compression, more CPU. Default: fast"
              persistent-hint clearable
            ></v-select>

            <v-text-field
              v-model="qualityConfig.TRANSCODE_CRF"
              type="number" label="CRF quality (0–51, lower = better)"
              density="compact" variant="outlined" class="mb-3"
              hint="Quality factor — 18 high quality, 23 default, 28 smaller files"
              persistent-hint clearable
            ></v-text-field>

            <v-text-field
              v-model="qualityConfig.TRANSCODE_TIMEOUT"
              type="number" label="Transcode timeout (seconds)"
              density="compact" variant="outlined" class="mb-3"
              hint="Max duration for a single ffmpeg transcode. Default: 3600 (1 hour)"
              persistent-hint clearable
            ></v-text-field>

            <v-btn color="primary" variant="flat" class="text-none" :loading="qualitySaving" @click="saveConfig">Save settings</v-btn>
          </v-col>

          <!-- Right col: worker status -->
          <v-col cols="12" md="5" offset-md="1">
            <div class="d-flex align-center mb-3">
              <p class="text-subtitle-2 text-medium-emphasis text-uppercase ma-0" style="letter-spacing:.08em">Worker status</p>
              <v-spacer></v-spacer>
              <v-btn icon size="x-small" variant="text" :loading="videoStatusLoading" @click="refreshVideoStatus" title="Refresh">
                <v-icon size="16">mdi-refresh</v-icon>
              </v-btn>
            </div>

            <div v-if="qualityConfig.worker_status" class="mb-4 d-flex ga-2 flex-wrap align-center">
              <v-chip size="small" :color="workerStatusColor" :prepend-icon="workerStatusIcon" variant="tonal">
                {{ workerStatusLabel }}
              </v-chip>
              <div v-if="qualityConfig.worker_status.encoding_since" class="text-caption text-medium-emphasis">
                <div>{{ qualityConfig.worker_status.encoding_file }}</div>
                <div v-if="qualityConfig.worker_status.encoding_internal" style="opacity:0.6; font-size:0.75em; font-family:monospace">
                  {{ qualityConfig.worker_status.encoding_internal }}
                </div>
              </div>
            </div>

            <v-table v-if="qualityConfig.video_transcode_stats" density="compact" class="rounded">
              <thead>
                <tr>
                  <th class="text-caption text-medium-emphasis">State</th>
                  <th class="text-caption text-medium-emphasis">Count</th>
                  <th class="text-caption text-medium-emphasis">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><v-chip size="x-small" color="warning" variant="tonal">pending</v-chip></td>
                  <td class="text-body-2">{{ qualityConfig.video_transcode_stats.pending }}</td>
                  <td class="text-caption text-medium-emphasis">Waiting for worker</td>
                </tr>
                <tr>
                  <td><v-chip size="x-small" color="primary" variant="tonal">processing</v-chip></td>
                  <td class="text-body-2">{{ qualityConfig.video_transcode_stats.processing }}</td>
                  <td class="text-caption text-medium-emphasis">Currently encoding</td>
                </tr>
                <tr>
                  <td><v-chip size="x-small" color="error" variant="tonal">error</v-chip></td>
                  <td class="text-body-2">{{ qualityConfig.video_transcode_stats.error }}</td>
                  <td class="text-caption text-medium-emphasis">
                    ffmpeg failed —
                    <v-btn v-if="qualityConfig.video_transcode_stats.error > 0"
                      size="x-small" variant="text" color="error" :loading="retryLoading"
                      class="text-none pa-0" style="height:auto; min-width:0"
                      @click="retryErrors">retry</v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <p class="text-caption text-medium-emphasis mt-3">
              Errors are logged to stdout of the worker container.<br>
              <code>docker compose logs worker</code>
            </p>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ─────────────── Tab: Backup / Export ─────────────── -->
      <v-window-item value="backup">

        <!-- How it works -->
        <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">How it works</p>
        <v-table density="compact" class="rounded storage-table mb-6" style="max-width:640px">
          <tbody>
            <tr>
              <td class="text-caption text-medium-emphasis" style="width:140px">Dump folder</td>
              <td><code class="text-body-2">{{ qualityConfig.DUMP_ROOT || '/dumps/latest' }}</code></td>
            </tr>
            <tr>
              <td class="text-caption text-medium-emphasis">Raw photos</td>
              <td><code class="text-body-2">{{ qualityConfig.MEDIA_ROOT || '/data/static' }}/raw/</code></td>
            </tr>
          </tbody>
        </v-table>

        <v-alert type="info" variant="tonal" density="compact" class="mb-6" style="max-width:640px">
          <p class="text-body-2 mb-1">
            <strong>Export with raw files</strong> — everything lands in the dump folder (<code>DUMP_ROOT</code>):
            one <code>_meta.yml</code> + one <code>_exif.yml</code> per media, plus the raw file (<code>.jpg</code> for photos, <code>.mp4</code> + poster <code>.jpg</code> for videos).
            Mount <code>DUMP_ROOT</code> as a volume to retrieve the files (e.g. <code>./dumps:/dumps</code> in docker-compose).
          </p>
          <p class="text-body-2 mb-0">
            <strong>Export without raw files</strong> — only <code>_meta.yml</code> and <code>_exif.yml</code> are written to the dump folder.
            Raw files stay in <code>MEDIA_ROOT/raw/</code> — copy them manually if needed
            (e.g. <code>/tmp/data/photos/raw/</code> with the default docker-compose volume).
          </p>
        </v-alert>

        <v-row>
          <!-- Export -->
          <v-col cols="12" md="4">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Export</p>
            <v-switch
              v-model="exportIncludeRaw"
              :true-value="true"
              :false-value="false"
              label="Include raw photo files"
              color="primary"
              density="compact"
              class="mb-3 ml-2"
              hint="When enabled, raw files (.jpg, .mp4) are copied into the dump folder alongside the metadata."
              persistent-hint
            ></v-switch>
            <v-btn color="primary" variant="flat" class="text-none mt-4"
              :loading="exportLoading" :disabled="exportStatus && exportStatus.status === 'pending'"
              @click="exportConfirmDialog = true">Export</v-btn>

            <!-- Progress -->
            <div v-if="exportStatus && exportStatus.status !== 'none'" class="mt-4">
              <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                <span v-if="exportStatus.status === 'pending'">Exporting… {{ exportStatus.done }} / {{ exportStatus.total }}</span>
                <span v-else-if="exportStatus.status === 'completed'">
                  <v-icon size="14" color="success">mdi-check-circle-outline</v-icon>
                  Done — {{ exportStatus.total }} photos
                  <v-chip size="x-small" variant="tonal" :color="exportStatus.include_raw ? 'primary' : 'default'" class="ml-1">
                    {{ exportStatus.include_raw ? 'with raw files' : 'metadata only' }}
                  </v-chip>
                  <span v-if="exportStatus.errors && exportStatus.errors.length" class="text-error ml-1">({{ exportStatus.errors.length }} errors)</span>
                  <br v-if="exportStatus.completed_at">
                  <span v-if="exportStatus.completed_at" class="text-disabled" style="font-size: 11px;">{{ formatDate(exportStatus.completed_at) }}</span>
                </span>
              </div>
              <v-progress-linear
                v-if="exportStatus.total"
                :model-value="exportStatus.done / exportStatus.total * 100"
                :color="exportStatus.status === 'completed' ? 'success' : 'primary'"
                bg-color="surface-variant"
                rounded
                height="6"
              ></v-progress-linear>
            </div>
          </v-col>

          <!-- Import -->
          <v-col cols="12" md="4">
            <p class="text-subtitle-2 text-medium-emphasis text-uppercase mb-3" style="letter-spacing:.08em">Import</p>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Scans the dump folder for <code>.jpg</code> and <code>.mp4</code> files and ingests them.
              Existing entries have their metadata updated.
              New photos have EXIF re-extracted from the raw file; videos are queued for transcoding if no poster is found.
            </p>
            <v-btn variant="tonal" class="text-none"
              :loading="importLoading" :disabled="importStatus && importStatus.status === 'pending'"
              @click="importConfirmDialog = true">Import from dump folder</v-btn>

            <!-- Import progress -->
            <div v-if="importStatus && importStatus.status !== 'none'" class="mt-4">
              <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                <span v-if="importStatus.status === 'pending'">Importing… {{ importStatus.done }} / {{ importStatus.total }}</span>
                <span v-else-if="importStatus.status === 'completed'">
                  <v-icon size="14" color="success">mdi-check-circle-outline</v-icon>
                  {{ importStatus.imported }} imported, {{ importStatus.updated }} updated
                  <span v-if="importStatus.errors && importStatus.errors.length" class="text-error ml-1">({{ importStatus.errors.length }} errors)</span>
                  <br v-if="importStatus.completed_at">
                  <span v-if="importStatus.completed_at" class="text-disabled" style="font-size: 11px;">{{ formatDate(importStatus.completed_at) }}</span>
                </span>
              </div>
              <v-progress-linear
                v-if="importStatus.total"
                :model-value="importStatus.done / importStatus.total * 100"
                :color="importStatus.status === 'completed' ? 'success' : 'primary'"
                bg-color="surface-variant"
                rounded
                height="6"
              ></v-progress-linear>
              <div v-if="importStatus.status === 'completed' && importStatus.errors?.length" class="mt-2">
                <p class="text-caption text-error" v-for="e in importStatus.errors" :key="e">{{ e }}</p>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

    </v-window>

    <!-- Export confirm dialog -->
    <v-dialog v-model="exportConfirmDialog" max-width="420">
      <v-card>
        <v-card-title class="text-body-1 font-weight-medium pt-4 px-4">Confirm export</v-card-title>
        <v-card-text class="text-body-2 text-medium-emphasis px-4">
          This will <strong>delete the current dump folder</strong> and start a new export.
          Any previous dump will be lost.
          <span v-if="exportIncludeRaw"><br><br>Raw photo files will be included — this may take a while.</span>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" class="text-none" @click="exportConfirmDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" class="text-none" @click="exportConfirmDialog = false; runExport()">Export</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Import confirm dialog -->
    <v-dialog v-model="importConfirmDialog" max-width="420">
      <v-card>
        <v-card-title class="text-body-1 font-weight-medium pt-4 px-4">Confirm import</v-card-title>
        <v-card-text class="text-body-2 text-medium-emphasis px-4">
          Scans <code>{{ qualityConfig.DUMP_ROOT || 'DUMP_ROOT' }}</code> for <code>.jpg</code> and <code>.mp4</code> files and ingests them.
          <br><br>
          Existing entries will have their metadata updated. New photos and videos will be created.
          This action cannot be undone.
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" class="text-none" @click="importConfirmDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" class="text-none" @click="importConfirmDialog = false; runImport()">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script>
import { requireAdminOrContributor } from '../authrequired.js'
import TagGroupsEditor from '../components/TagGroupsEditor.vue'
import { useAsyncFetch, useAsyncPost } from '../reactivefetch.js'
import { useAlertStore } from '../stores/alert'
import { useAppConfigStore } from '../stores/appConfig.js'
import sampleTagsYaml from '../data/tags_sample.yml?raw'
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
    tagsEmpty: false,
    sampleLoading: false,
    tagGroups: [],
    tagsPreviewSelection: {},

    // Backup / Export tab
    exportIncludeRaw: true,
    exportLoading: false,
    exportStatus: null,
    exportPollInterval: null,
    exportConfirmDialog: false,
    importLoading: false,
    importStatus: null,
    importPollInterval: null,
    importConfirmDialog: false,

    // Video tab
    videoStatusLoading: false,
    retryLoading: false,

    // Photo quality tab
    qualityConfig: {},
    qualitySampleYaml: '',
    qualityLoading: false,
    qualitySaving: false,
    resampleLoading: false,
    qualityPresets: [
      { label: 'None — original file, no re-encoding', value: null },
      { label: 'web_low',       value: 'web_low' },
      { label: 'web_medium',    value: 'web_medium' },
      { label: 'web_high',      value: 'web_high' },
      { label: 'web_very_high', value: 'web_very_high' },
      { label: 'web_maximum',   value: 'web_maximum' },
    ],
  }),

  async mounted() {
    const result = await requireAdminOrContributor(this)
    if (!result) return  // redirected — stop here

    this.role = result.role
    this.currentUserId = result.id
    const queryTab = this.$route.query.tab
    const defaultTab = this.role === 'contributor' ? 'tags' : 'users'
    this.tab = queryTab || defaultTab
    await this.onTabChange(this.tab)

    if (this.role === 'admin') await this.loadUsers()
    await this.loadTags()
  },

  beforeUnmount() {
    this._stopExportPolling()
    this._stopImportPolling()
    if (this._cmEditor) {
      this._cmEditor.destroy()
      this._cmEditor = null
    }
    if (this._cmSampleEditor) {
      this._cmSampleEditor.destroy()
      this._cmSampleEditor = null
    }
  },

  computed: {
    diskUsageColor() {
      if (!this.qualityConfig.disk_usage) return 'primary'
      const pct = this.qualityConfig.disk_usage.used / this.qualityConfig.disk_usage.total * 100
      if (pct > 90) return 'error'
      if (pct > 75) return 'warning'
      return 'primary'
    },

    workerStatusColor() {
      const ws = this.qualityConfig.worker_status
      if (!ws || !ws.last_seen) return 'default'
      const interval = (parseInt(this.qualityConfig.TRANSCODE_POLL_INTERVAL) || 10) * 1000
      const elapsed = Date.now() - new Date(ws.last_seen).getTime()
      if (elapsed > interval * 3) return 'error'
      if (ws.encoding_since) return 'primary'
      return 'success'
    },

    workerStatusIcon() {
      const ws = this.qualityConfig.worker_status
      if (!ws || !ws.last_seen) return 'mdi-circle-off-outline'
      const interval = (parseInt(this.qualityConfig.TRANSCODE_POLL_INTERVAL) || 10) * 1000
      const elapsed = Date.now() - new Date(ws.last_seen).getTime()
      if (elapsed > interval * 3) return 'mdi-circle-off-outline'
      if (ws.encoding_since) return 'mdi-cog-sync-outline'
      return 'mdi-circle-outline'
    },

    workerStatusLabel() {
      const ws = this.qualityConfig.worker_status
      if (!ws || !ws.last_seen) return 'Worker offline'
      const interval = (parseInt(this.qualityConfig.TRANSCODE_POLL_INTERVAL) || 10) * 1000
      const elapsed = Date.now() - new Date(ws.last_seen).getTime()
      if (elapsed > interval * 3) return 'Worker offline'
      if (ws.encoding_since) {
        const sec = Math.round((Date.now() - new Date(ws.encoding_since).getTime()) / 1000)
        return `Encoding — ${sec}s`
      }
      const sec = Math.round(elapsed / 1000)
      return `Worker online — ${sec}s ago`
    },
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
      this.$router.replace({ query: { ...this.$route.query, tab } })
      if (tab === 'backup') {
        await this._loadExportStatus()
        await this._loadImportStatus()
      }
      if (tab === 'tags') {
        await this.$nextTick()
        this._initEditor(this.tagsYaml)
      }
      if (tab === 'quality' || tab === 'video') {
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
        this.tagsEmpty = (tagsRes.data.value?.data?.tag_groups?.length ?? 0) === 0
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

    // ── Video tab ─────────────────────────────────────────────────────────
    async refreshVideoStatus() {
      this.videoStatusLoading = true
      await this.loadConfig()
      this.videoStatusLoading = false
    },

    async retryErrors() {
      this.retryLoading = true
      await useAsyncPost('/api/admin/retry-errors', {})
      await this.loadConfig()
      this.retryLoading = false
    },

    // ── Photo quality ─────────────────────────────────────────────────────
    async loadConfig() {
      this.qualityLoading = true
      const { data } = await useAsyncFetch('/api/admin/config')
      if (data.value && !data.value.ERROR) {
        const cfg = data.value.data || {}
        // Normalize boolean (backend may return '1'/'0'/True/False/'True'/'False')
        cfg.RAW_PHOTO_OVERRIDE_EXISTS = ['True', 'true', '1', 1, true].includes(cfg.RAW_PHOTO_OVERRIDE_EXISTS)
        cfg.GENERATE_SAMPLES_ON_UPLOAD = ['True', 'true', '1', 1, true].includes(cfg.GENERATE_SAMPLES_ON_UPLOAD)
        cfg.ALLOW_VIDEO_UPLOAD = ['True', 'true', '1', 1, true].includes(cfg.ALLOW_VIDEO_UPLOAD)
        cfg.KEEP_ORIGINAL_VIDEO = ['True', 'true', '1', 1, true].includes(cfg.KEEP_ORIGINAL_VIDEO)
        // Normalize null-ish values
        if (!cfg.RAW_PHOTOS_QUALITY) cfg.RAW_PHOTOS_QUALITY = null
        if (!cfg.RAW_PHOTOS_MAX_SIZE) cfg.RAW_PHOTOS_MAX_SIZE = null
        this.qualityConfig = cfg
        this.qualitySampleYaml = cfg.SAMPLE_PHOTOS_SETTINGS || ''
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
        RAW_PHOTOS_QUALITY:        this.qualityConfig.RAW_PHOTOS_QUALITY || '',
        RAW_PHOTOS_MAX_SIZE:       this.qualityConfig.RAW_PHOTOS_MAX_SIZE || '',
        RAW_PHOTO_OVERRIDE_EXISTS:  this.qualityConfig.RAW_PHOTO_OVERRIDE_EXISTS ? 'True' : 'False',
        GENERATE_SAMPLES_ON_UPLOAD: this.qualityConfig.GENERATE_SAMPLES_ON_UPLOAD ? 'True' : 'False',
        ALLOW_VIDEO_UPLOAD:         this.qualityConfig.ALLOW_VIDEO_UPLOAD ? 'True' : 'False',
        KEEP_ORIGINAL_VIDEO:        this.qualityConfig.KEEP_ORIGINAL_VIDEO ? 'True' : 'False',
        TRANSCODE_POLL_INTERVAL:    this.qualityConfig.TRANSCODE_POLL_INTERVAL || '',
        TRANSCODE_THREADS:          this.qualityConfig.TRANSCODE_THREADS || '',
        TRANSCODE_PRESET:           this.qualityConfig.TRANSCODE_PRESET || '',
        TRANSCODE_CRF:              this.qualityConfig.TRANSCODE_CRF || '',
        TRANSCODE_TIMEOUT:          this.qualityConfig.TRANSCODE_TIMEOUT || '',
        GALLERY_PAGE_SIZE_DESKTOP:  this.qualityConfig.GALLERY_PAGE_SIZE_DESKTOP || '',
        GALLERY_PAGE_SIZE_MOBILE:   this.qualityConfig.GALLERY_PAGE_SIZE_MOBILE || '',
        SAMPLE_PHOTOS_SETTINGS:    this.qualitySampleYaml,
      }
      const { data } = await useAsyncPost('/api/admin/config', payload)
      this.qualitySaving = false
      if (data.value && !data.value.ERROR) {
        useAppConfigStore().invalidate()
        triggerAlert('success', 'Settings saved', '')
      } else {
        triggerAlert('error', 'Save failed', data.value?.details || '')
      }
    },

    async runExport() {
      const { triggerAlert } = useAlertStore()
      this.exportLoading = true
      this.exportStatus = null  // reset bar before new export
      const { data } = await useAsyncPost('/api/admin/export', { include_raw: this.exportIncludeRaw })
      this.exportLoading = false
      if (data.value && !data.value.ERROR) {
        this._startExportPolling()
      } else {
        triggerAlert('error', 'Export failed', data.value?.details || '')
      }
    },

    async _loadImportStatus() {
      const { data } = await useAsyncFetch('/api/admin/import/status')
      if (data.value && !data.value.ERROR) {
        this.importStatus = data.value.data
        if (this.importStatus?.status === 'pending') this._startImportPolling()
      }
    },

    async _loadExportStatus() {
      const { data } = await useAsyncFetch('/api/admin/export/status')
      if (data.value && !data.value.ERROR) {
        this.exportStatus = data.value.data
        if (this.exportStatus?.status === 'pending') this._startExportPolling()
      }
    },

    _startExportPolling() {
      this._stopExportPolling()
      this.exportPollInterval = setInterval(async () => {
        const { data } = await useAsyncFetch('/api/admin/export/status')
        if (data.value && !data.value.ERROR) {
          this.exportStatus = data.value.data
          if (this.exportStatus.status === 'completed') {
            this._stopExportPolling()
            const { triggerAlert } = useAlertStore()
            const errors = this.exportStatus.errors?.length || 0
            if (errors) {
              triggerAlert('warning', 'Export done with errors', `${this.exportStatus.total} photos, ${errors} errors`)
            } else {
              triggerAlert('success', 'Export complete', `${this.exportStatus.total} photos exported`)
            }
          }
        }
      }, 2000)
    },

    _stopExportPolling() {
      if (this.exportPollInterval) {
        clearInterval(this.exportPollInterval)
        this.exportPollInterval = null
      }
    },

    async runImport() {
      const { triggerAlert } = useAlertStore()
      this.importLoading = true
      this.importStatus = null
      const { data } = await useAsyncPost('/api/admin/import', {})
      this.importLoading = false
      if (data.value && !data.value.ERROR) {
        this._startImportPolling()
      } else {
        triggerAlert('error', 'Import failed', data.value?.details || '')
      }
    },

    _startImportPolling() {
      this._stopImportPolling()
      this.importPollInterval = setInterval(async () => {
        const { data } = await useAsyncFetch('/api/admin/import/status')
        if (data.value && !data.value.ERROR) {
          this.importStatus = data.value.data
          if (this.importStatus.status === 'completed') {
            this._stopImportPolling()
            const { triggerAlert } = useAlertStore()
            const errors = this.importStatus.errors?.length || 0
            if (errors) {
              triggerAlert('warning', 'Import done with errors', `${this.importStatus.imported} imported, ${this.importStatus.updated} updated, ${errors} errors`)
            } else {
              triggerAlert('success', 'Import complete', `${this.importStatus.imported} imported, ${this.importStatus.updated} updated`)
            }
          }
        }
      }, 2000)
    },

    _stopImportPolling() {
      if (this.importPollInterval) {
        clearInterval(this.importPollInterval)
        this.importPollInterval = null
      }
    },

    formatDate(iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleString()
    },

    async flushSamples() {
      const { triggerAlert } = useAlertStore()
      this.resampleLoading = true
      const { data } = await useAsyncPost('/api/admin/flush-samples', {})
      this.resampleLoading = false
      if (data.value && !data.value.ERROR) {
        const n = data.value.data?.deleted ?? 0
        triggerAlert('success', 'Samples flushed', `${n} files deleted — will regenerate on next access`)
      } else {
        triggerAlert('error', 'Flush failed', data.value?.details || '')
      }
    },

    formatBytes(bytes) {
      if (!bytes) return '–'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let i = 0
      while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
      return bytes.toFixed(1) + ' ' + units[i]
    },

    loadSample() {
      this.tagsYaml = sampleTagsYaml
      this.tagsEmpty = false
      this._initEditor(sampleTagsYaml)
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

/* Storage paths table */
.storage-table tbody td {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
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
