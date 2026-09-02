<template>
  <div class="room">
    <div v-if="error" class="room__notice column flex-center text-center">
      <div class="text-h6 q-mb-sm">Can't join this room</div>
      <div class="text-body2 text-grey-7">{{ error }}</div>
    </div>
    <div v-else ref="videoConference" class="room__stage"></div>
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

<style lang="scss" scoped>
.room {
  position: fixed;
  inset: 0;
  overflow: hidden;
  box-sizing: border-box;
  // 100dvh follows the mobile browser's collapsing toolbars, so the call
  // controls never end up underneath them. vh is the fallback.
  height: 100vh;
  height: 100dvh;
  // index.html sets viewport-fit=cover, so without this the ZEGOCLOUD UI -
  // which knows nothing about safe areas - would run under a notch. These
  // insets are 0 on hardware that has none.
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);
  background: #000;
}

.room__stage {
  width: 100%;
  height: 100%;
}

.room__notice {
  height: 100%;
  padding: 16px;
  background: #fff;
}
</style>
