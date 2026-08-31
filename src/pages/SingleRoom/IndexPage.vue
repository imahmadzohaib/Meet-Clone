```vue
<template>
  <div class="fullscreen">
    <div ref="videoConference" class="full-height"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import { generateRandomId } from '@/utils'

const route = useRoute()
const videoConference = ref<HTMLElement | null>(null)

onMounted(async() => {

  const roomID =
    (route.params.roomID as string) ||
    (route.query.roomID as string) ||
    generateRandomId(5)

  const userID = generateRandomId(5)

  const appID = Number(import.meta.env.QCLI_ZEGO_APP_ID)
    const response = await fetch(
      `/api/zego-token?userID=${encodeURIComponent(userID)}`
)


   const { token } = await response.json()


  if (!appID || !token) {
    console.error('ZEGOCLOUD credentials are missing')
    return
  }

  if (!videoConference.value) {
    console.error('Video conference container is not available')
    return
  }

  const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
    appID,
    token,
    roomID,
    userID,
    `user_${Date.now()}`,
    720
  )

  const zp = ZegoUIKitPrebuilt.create(kitToken)

  zp.joinRoom({
    container: videoConference.value,

    sharedLinks: [
      {
        name: 'Shareable Link',
        url: `${window.location.origin}?roomID=${encodeURIComponent(roomID)}`,
      },
    ],

    scenario: {
      mode: ZegoUIKitPrebuilt.VideoConference,
    },

    maxUsers: 10,

    turnOnMicrophoneWhenJoining: true,
    turnOnCameraWhenJoining: true,
  })
})
</script>

