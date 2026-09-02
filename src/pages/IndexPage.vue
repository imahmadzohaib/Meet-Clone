<template>
  <!-- grey-7 (#757575) rather than grey-6: white text on grey-6 measures 2.7:1,
       which fails WCAG AA and is hardest to read on a phone outdoors. grey-7 is
       the nearest step that clears 4.5:1 (measured 4.6:1) and it matches the
       theme-color already declared in index.html. -->
  <q-page class="hero bg-grey-7 text-white" :style-fn="pageStyleFn">
    <div class="hero__inner text-center">
      <img
        class="hero__logo"
        src="../assets/logo.svg"
        alt="Meet PRO"
        width="134"
        height="82"
      />

      <h1 class="hero__title text-h6">Video Conference</h1>

      <p class="hero__lede">
        Video Conference Kit is created and maintained by
        <a
          class="hero__link"
          href="https://imahmadzohaib.github.io/AhmadZohaib/"
          target="_blank"
          rel="noopener noreferrer"
          >Ahmad Zohaib</a
        >.
      </p>

      <q-card class="bg-grey-3" flat>
        <q-card-section class="hero__card-section">
          <q-form class="q-gutter-y-md" @submit.prevent="join">
            <q-input
              v-model="roomID"
              class="hero__input"
              outlined
              placeholder="Enter room ID to join a meeting"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              maxlength="64"
            >
              <!-- Quasar's gt-xs/lt-sm are plain media queries, so the swap
                   happens in CSS. $q.screen would put it behind a JS resize
                   listener for no benefit. Below 600px an append-slot button
                   leaves the placeholder almost no room, so it moves under
                   the field and goes full width. -->
              <template #append>
                <q-btn
                  class="gt-xs"
                  dense
                  padding="4px 16px"
                  color="primary"
                  label="Join"
                  no-caps
                  unelevated
                  :disable="!canJoin"
                  @click="join"
                />
              </template>
            </q-input>

            <q-btn
              class="hero__action lt-sm full-width"
              type="submit"
              color="primary"
              label="Join"
              no-caps
              unelevated
              :disable="!canJoin"
            />

            <q-btn
              class="hero__action hero__action--create"
              color="primary"
              label="Or create a new meeting"
              no-caps
              unelevated
              @click="create"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { generateRandomId } from '@/utils'

const roomID = ref<string>('')
const router = useRouter()
const route = useRoute()

const canJoin = computed(() => roomID.value.trim().length > 0)

// QPage otherwise sizes itself from a JS-cached viewport height, which lags a
// rotation or a collapsing mobile toolbar. dvh lets the browser do it.
function pageStyleFn(offset: number) {
  return { minHeight: offset ? `calc(100dvh - ${offset}px)` : '100dvh' }
}

function open(id: string) {
  router.push(`/room/${encodeURIComponent(id)}`)
}

function join() {
  if (canJoin.value) open(roomID.value.trim())
}

function create() {
  open(generateRandomId(5))
}

onMounted(() => {
  if (route.query.roomID) open(String(route.query.roomID))
})
</script>

<style lang="scss" scoped>
.hero {
  // Centred with margin auto on the child rather than justify-content, so a
  // viewport shorter than the content scrolls instead of clipping its top.
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px max(16px, env(safe-area-inset-right)) 24px
    max(16px, env(safe-area-inset-left));
}

.hero__inner {
  width: 100%;
  max-width: 600px;
  margin-block: auto;
}

.hero__logo {
  width: clamp(88px, 26vw, 134px);
  height: auto;
}

// Spacing lives here rather than in q-mt-*/q-mb-* classes: a scoped rule
// carries the extra data-v attribute, so it silently outranks them.
.hero__title {
  margin: 16px 0 8px;
}

.hero__lede {
  margin: 0 0 24px;
  font-size: clamp(0.875rem, 0.82rem + 0.25vw, 1rem);
  line-height: 1.55;
}

// The UA's default link blue sits at 3.5:1 on this grey; inheriting the
// paragraph's white is both lighter and consistent. The underline is what
// marks it as a link, so it stays.
.hero__link {
  color: inherit;
  text-decoration: underline;
}

.hero__card-section {
  padding: 20px;
}

.hero__action {
  min-height: 44px; // comfortable tap target
}

.hero__action--create {
  width: 100%;
}

// iOS zooms the page in when a focused field is under 16px.
.hero__input :deep(input) {
  font-size: 16px;
}

@media (min-width: 600px) {
  .hero__card-section {
    padding: 40px;
  }

  .hero__action--create {
    width: auto;
  }

  .hero__input :deep(input) {
    font-size: 14px;
  }
}
</style>
