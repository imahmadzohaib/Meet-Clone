<template>
  <div class="fullscreen">
    <div
      v-if="error"
      class="column flex-center full-height q-pa-md text-center"
    >
      <div class="text-h6 q-mb-sm">Can't join this room</div>
      <div class="text-body2 text-grey-7">{{ error }}</div>
    </div>
    <div v-else ref="videoConference" class="full-height"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import { generateRandomId } from '@/utils'

type TokenResponse = {
  appID?: number
  userID?: string
  token?: string
}

const route = useRoute()
const videoConference = ref<HTMLElement | null>(null)
const error = ref('')

let zp: ReturnType<typeof ZegoUIKitPrebuilt.create> | null = null

onMounted(async () => {
  const roomID =
    (route.params.roomID as string) ||
    (route.query.roomID as string) ||
    generateRandomId(5)

  // The appID, userID and token all come from /api/zego-token. The Server
  // Secret stays on the server, so nothing secret is bundled into this file.
  let payload: TokenResponse | null = null

  try {
    const response = await fetch('/api/zego-token')
    if (!response.ok) {
      throw new Error(`token endpoint returned ${response.status}`)
    }
    payload = (await response.json()) as TokenResponse
  } catch (err) {
    console.error('Could not fetch a ZEGOCLOUD token:', err)
    error.value = 'The room service is unavailable right now. Please try again.'
    return
  }

  if (!payload?.appID || !payload.userID || !payload.token) {
    error.value = 'The room service returned an incomplete response.'
    return
  }

  const { appID, userID, token } = payload

  if (!videoConference.value) {
    error.value = 'Could not initialise the video container.'
    return
  }

  const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
    appID,
    token,
    roomID,
    userID,
    `user_${userID}`
  )

  zp = ZegoUIKitPrebuilt.create(kitToken)

  zp.joinRoom({
    container: videoConference.value,

    sharedLinks: [
      {
        name: 'Shareable Link',
        url: `${window.location.origin}/room/${encodeURIComponent(roomID)}`
      }
    ],

    scenario: {
      mode: ZegoUIKitPrebuilt.VideoConference
    },

    maxUsers: 10,

    turnOnMicrophoneWhenJoining: true,
    turnOnCameraWhenJoining: true
  })
})

onBeforeUnmount(() => {
  zp?.destroy()
  zp = null
})
</script>
