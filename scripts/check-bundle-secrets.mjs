// Fails the build if a server-only secret was inlined into the client bundle.
//
// Quasar auto-loads .env files and Vite replaces every import.meta.env
// reference with a literal string, so a single stray reference is enough to
// publish a secret. This runs after `quasar build` as a backstop.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST = 'dist/spa'
const SCANNED = /\.(js|mjs|css|html|json|map)$/
const GUARDED = [
  'ZEGO_SERVER_SECRET',
  'QCLI_ZEGO_SERVER_SECRET',
  'VITE_ZEGO_SERVER_SECRET'
]

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

// On Vercel the guarded names are real environment variables, so the check runs
// as-is. Locally they only exist in .env, which npm does not put in process.env,
// and without them there is nothing to compare the bundle against. Load it so a
// local `npm run build` verifies for real instead of skipping.
try {
  process.loadEnvFile('.env') // Node >= 20.12
} catch {
  // No .env here (CI, or a fresh clone) - fall through to the skip below.
}

const secrets = GUARDED.map(name => [name, process.env[name]]).filter(
  ([, value]) => value
)

if (secrets.length === 0) {
  console.log(
    'check-bundle-secrets: no guarded secrets in env, nothing to compare against'
  )
  process.exit(0)
}

const leaks = []

for await (const file of walk(DIST)) {
  if (!SCANNED.test(file)) continue
  const contents = await readFile(file, 'utf8')
  for (const [name, value] of secrets) {
    if (contents.includes(value)) leaks.push(`${name} found in ${file}`)
  }
}

if (leaks.length > 0) {
  console.error(
    '\ncheck-bundle-secrets: SERVER SECRET PRESENT IN CLIENT BUNDLE\n'
  )
  for (const leak of leaks) console.error(`  ${leak}`)
  console.error(
    '\nRemove the import.meta.env reference and any quasar.config.js'
  )
  console.error(
    'build.env entry for it, then rebuild. Do not deploy this bundle.\n'
  )
  process.exit(1)
}

console.log(
  `check-bundle-secrets: OK, ${secrets.length} guarded secret(s) absent from ${DIST}`
)
