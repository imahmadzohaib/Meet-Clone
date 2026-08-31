<template>
  <q-layout view="hHh lpR fFf">

    <q-drawer show-if-above v-model="rightDrawerOpen" side="right" bordered>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref } from 'vue'

const rightDrawerOpen = ref(false)
toggleRightDrawer () {
  rightDrawerOpen.value = !rightDrawerOpen.value
}
</script>
