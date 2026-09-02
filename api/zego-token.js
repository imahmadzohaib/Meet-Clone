import { randomInt } from 'node:crypto'
import { generateToken04 } from './_lib/token04.js'

// Mints a short-lived ZEGOCLOUD token so the Server Secret never leaves the
// server. The browser gets a token that expires; it never gets the secret.

const TOKEN_TTL_SECONDS = 3600
const USER_ID_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function makeUserID() {
  let userID = ''
  for (let i = 0; i < 12; i++) {
    userID += USER_ID_CHARS.charAt(randomInt(USER_ID_CHARS.length))
  }
  return userID
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const appID = Number(process.env.ZEGO_APP_ID)
  const serverSecret = process.env.ZEGO_SERVER_SECRET

  if (!Number.isInteger(appID) || appID <= 0 || !serverSecret) {
    console.error('ZEGO_APP_ID and/or ZEGO_SERVER_SECRET are not configured')
    return res.status(500).json({ error: 'Server is not configured' })
  }

  // Minted here rather than accepted from the query string so a caller cannot
  // request a token for an identity of its choosing.
  const userID = makeUserID()

  try {
    const token = generateToken04(
      appID,
      userID,
      serverSecret,
      TOKEN_TTL_SECONDS
    )
    return res
      .status(200)
      .json({ appID, userID, token, expiresIn: TOKEN_TTL_SECONDS })
  } catch (err) {
    // Deliberately not echoed to the client: validation errors describe the secret.
    console.error('Failed to generate ZEGO token:', err?.message)
    return res.status(500).json({ error: 'Could not issue a token' })
  }
}
