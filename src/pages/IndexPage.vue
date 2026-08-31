<template>
  <div class="flex flex-center fullscreen bg-grey-6 text-white">

    <div class="">
      <div style="max-width: 600px; width: 100%;" class="q-mx-auto text-center" >
        <img src="../assets/logo.svg" alt="" >
        <h6 class="q-my-none q-mb-md">Video Conference</h6>
        <p>
          Video Conference Kit is a prebuilt feature-rich component, which enables you to build video
           conferences into your app in minutes.
        </p>
        <q-card class="bg-grey-3" flat>

          <q-card-section class="q-pa-xl">
            <div class="q-gutter-y-md">
              <q-input dense v-model="roomID" unelevated outlined placeholder="Enter room ID to join a meeting" >
                <template v-slot:append>
                  <q-btn dense padding="2px 16px" :disable="!roomID.trim()" color="primary" label="Join" np-caps unelevated 
                  @click="router.push(`/room/${roomID.trim()}`)"></q-btn>
                </template>
              </q-input>
              <div>
                <q-btn color="primary" label="Or create a new meeting" no-caps unelevated 
                @click="router.push(`/room/${generateRandomId(5)}`)"></q-btn>
              </div>
            </div>
          </q-card-section>
        </q-card>

      </div>


    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { generateRandomId } from '@/utils';

const roomID = ref<string>('')
const router = useRouter()

const route = useRoute();

onMounted(() => {
  if (route.query.roomID) {
    router.push(`/room/${route.query.roomID}`)
  }
})

</script>

<style>

</style>