import { createCipheriv, randomInt } from 'node:crypto'

// ZEGOCLOUD Token04 generator, ported from the official implementation:
// https://github.com/ZEGOCLOUD/zego_server_assistant -> token/nodejs/server/zegoServerAssistant.js
//
// This lives under api/_lib/ on purpose. Vercel ignores api/ paths that start
// with an underscore, so it is never published as an endpoint, and because it
// only ever runs on the server the Server Secret cannot reach the browser.

const IV_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'

function makeRandomIv() {
  let iv = ''
  for (let i = 0; i < 16; i++) {
    iv += IV_CHARS.charAt(randomInt(IV_CHARS.length))
  }
  return iv
}

// The Server Secret doubles as the AES key, so its byte length picks the cipher.
function getAlgorithm(key) {
  switch (Buffer.byteLength(key)) {
    case 16:
      return 'aes-128-cbc'
    case 24:
      return 'aes-192-cbc'
    case 32:
      return 'aes-256-cbc'
    default:
      throw new Error('Invalid ZEGO Server Secret length')
  }
}

function aesEncrypt(plainText, key, iv) {
  const cipher = createCipheriv(getAlgorithm(key), key, iv)
  cipher.setAutoPadding(true) // CBC/PKCS5Padding
  return Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
}

export function generateToken04(
  appID,
  userID,
  secret,
  effectiveTimeInSeconds,
  payload = ''
) {
  if (!Number.isInteger(appID) || appID <= 0) {
    throw new Error('appID invalid')
  }
  if (!userID || typeof userID !== 'string') {
    throw new Error('userID invalid')
  }
  if (typeof secret !== 'string' || secret.length !== 32) {
    throw new Error('ZEGO Server Secret must be a 32 character string')
  }
  if (
    !Number.isInteger(effectiveTimeInSeconds) ||
    effectiveTimeInSeconds <= 0
  ) {
    throw new Error('effectiveTimeInSeconds invalid')
  }

  const ctime = Math.floor(Date.now() / 1000)
  const expire = ctime + effectiveTimeInSeconds

  const plainText = JSON.stringify({
    app_id: appID,
    user_id: userID,
    nonce: randomInt(-2147483648, 2147483648),
    ctime,
    expire,
    payload
  })

  const iv = makeRandomIv()
  const ciphertext = aesEncrypt(plainText, secret, iv)

  // expire (int64 BE) | iv length (uint16 BE) | iv | ciphertext length (uint16 BE) | ciphertext
  const expireBuf = Buffer.alloc(8)
  expireBuf.writeBigInt64BE(BigInt(expire), 0)

  const ivLenBuf = Buffer.alloc(2)
  ivLenBuf.writeUInt16BE(iv.length, 0)

  const ctLenBuf = Buffer.alloc(2)
  ctLenBuf.writeUInt16BE(ciphertext.length, 0)

  const body = Buffer.concat([
    expireBuf,
    ivLenBuf,
    Buffer.from(iv, 'utf8'),
    ctLenBuf,
    ciphertext
  ])

  return `04${body.toString('base64')}`
}
