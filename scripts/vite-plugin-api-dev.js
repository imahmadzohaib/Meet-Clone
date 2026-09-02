// Runs the /api functions inside `quasar dev`.
//
// Vite otherwise resolves /api/zego-token to api/zego-token.js and serves it to
// the browser as a transformed module, which both breaks the request and hands
// the handler's source to the client. This intercepts /api/* before Vite's
// internal middlewares and invokes the handler in Node instead.

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const API_DIR = resolve('api')
const SAFE_NAME = /^[a-z0-9-]+$/

// Vercel's Node runtime adds these to the response; the raw http.ServerResponse
// does not, so the handler gets the same surface it has in production.
function shimResponse(res) {
  res.status = code => {
    res.statusCode = code
    return res
  }
  res.json = body => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
    return res
  }
  return res
}

function loadEnvOnce() {
  if (process.env.ZEGO_SERVER_SECRET !== undefined) return
  try {
    process.loadEnvFile('.env') // Node >= 20.12, server-side only
  } catch {
    // No .env locally; the handler will answer 500 and say so.
  }
}

export function apiDevPlugin() {
  return {
    name: 'meetpro:api-dev',
    apply: 'serve',

    configureServer(server) {
      // Registering here (rather than in a returned post hook) puts this ahead
      // of Vite's transform and static middlewares.
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url, 'http://localhost').pathname
        if (!pathname.startsWith('/api/')) return next()

        const name = pathname.slice('/api/'.length)
        const file = join(API_DIR, `${name}.js`)

        // Underscored paths are private helpers; Vercel does not publish them.
        if (!SAFE_NAME.test(name) || !existsSync(file)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: 'Not found' }))
        }

        loadEnvOnce()

        try {
          // Cache-busted so edits to api/*.js apply without a restart.
          const mod = await import(
            `${pathToFileURL(file).href}?t=${Date.now()}`
          )
          await mod.default(req, shimResponse(res))
        } catch (err) {
          console.error(`[api-dev] ${pathname} failed:`, err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Handler threw' }))
        }
      })
    }
  }
}
