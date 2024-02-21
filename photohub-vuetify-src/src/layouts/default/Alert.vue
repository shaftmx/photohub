<template>
  <!-- https://vuetifyjs.com/en/components/alerts/#anatomy -->

  <!-- Error message -->
  <div class="text-center">
    <v-snackbar v-model="showAlert" :timeout="timeout" :color="type" location='bottom'>
      <p class="font-weight-bold text-h6">
        <v-icon v-if="type === 'error'" icon="mdi-alert-circle" size="x-large"></v-icon>
        <v-icon v-if="type === 'success'" icon="mdi-check-circle" size="x-large"></v-icon>
        {{ message }}
      </p>
      {{ detail }}
    </v-snackbar>
  </div>


  <!-- Success message -->
  <!-- <div class="text-center">
    <v-snackbar v-model="snackbar" :timeout="timeout" color="success" location='bottom'>
      <p class="font-weight-bold text-h6">
        <v-icon icon="mdi-check-circle" size="x-large"></v-icon>
        Success message
      </p>
      here is my text hhhhhhhhhhhhhhhhhhazea<br />heaz heha zhe hazeh azheh ahzeh azhe hazehhahzehazhehhhhhhhaz ehazhe
      ahzeh
    </v-snackbar>
  </div> -->
</template>

<script setup>
  import { storeToRefs } from 'pinia'
  import { useAlertStore } from '../../stores/alert'
  const timeout = 7000
  const { showAlert, type, message, detail, code } = storeToRefs(useAlertStore())
</script>